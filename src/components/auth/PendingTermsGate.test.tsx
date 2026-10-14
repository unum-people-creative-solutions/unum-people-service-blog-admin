import { act, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import PendingTermsGate from './PendingTermsGate';
import { termsApi } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { comoMock } from '@/test/mocks';

vi.mock('@/lib/api', () => ({
  termsApi: {
    getStatus: vi.fn(),
  },
}));

const originalLocation = window.location;

const fakeJwt = (claims: Record<string, unknown>) => {
  const b64 = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64(claims)}.sig`;
};

const pendingContract = (canAccept: boolean) => ({
  pending: [
    {
      type: 'contratacao_servico',
      term_id: '3',
      term_name: 'Contrato de Serviço',
      required_version: 1,
      can_accept: canAccept,
      document_url: 'https://cdn.example.com/terms/v3.html',
    },
  ],
});

const GLOBAL_ADMIN_NOTICE =
  'O termo de contratação desta empresa está pendente. Só um administrador da empresa pode aceitá-lo.';

describe('PendingTermsGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Tenant já resolvido por padrão: cobre o comportamento pós-resolução exercido
    // pelos demais testes. O teste dedicado de propagação de tenant sobrescreve isso.
    useAuthStore.setState({ tenantsLoaded: true });

    // Mock window.location.href
    // @ts-expect-error -- o jsdom não deixa trocar location sem apagá-la antes
    delete window.location;
    // O setter de window.location só aceita string; o teste troca o objeto inteiro.
    (window as unknown as { location: Location }).location = {
      href: 'http://localhost/posts',
    } as Location;
  });

  afterEach(() => {
    useAuthStore.setState({ tenantsLoaded: false });
    (window as unknown as { location: Location }).location = originalLocation;
  });

  it('não renderiza nada quando não há pendências (pending=[])', async () => {
    comoMock(termsApi.getStatus).mockResolvedValue({ pending: [] });

    const { container } = render(<PendingTermsGate />);

    await waitFor(() => {
      expect(termsApi.getStatus).toHaveBeenCalled();
    });

    expect(container.firstChild).toBeNull();
  });

  it('exibe modal com botão quando há termo pendente que pode ser aceito (can_accept=true)', async () => {
    comoMock(termsApi.getStatus).mockResolvedValue({
      pending: [
        {
          type: 'termos_uso',
          term_id: '1',
          term_name: 'Termo de Uso do Blog',
          required_version: 1,
          can_accept: true,
          document_url: 'https://cdn.example.com/terms/v1.html',
        },
      ],
    });

    render(<PendingTermsGate />);

    await screen.findByText('Você tem termos pendentes');
    
    // Não deve renderizar checkbox nem conteúdo do termo
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByText('Termo de Uso do Blog')).not.toBeInTheDocument();

    const button = screen.getByRole('button', { name: /ir para o portal do cliente/i });
    expect(button).toBeInTheDocument();

    // Clicar no botão redireciona para o Portal do Cliente
    fireEvent.click(button);

    const expectedUrl = `https://customer.unumpeople.com.br?return_to=${encodeURIComponent('http://localhost/posts')}`;
    expect(window.location.href).toBe(expectedUrl);
  });

  it('exibe tela de espera e faz polling a cada 15s quando can_accept=false', async () => {
    vi.useFakeTimers();
    try {
      comoMock(termsApi.getStatus)
        .mockResolvedValueOnce({
          pending: [
            {
              type: 'contratacao_servico',
              term_id: '2',
              term_name: 'Contrato de Serviço',
              required_version: 1,
              can_accept: false,
              document_url: 'https://cdn.example.com/terms/v2.html',
            },
          ],
        })
        .mockResolvedValue({
          pending: [],
        });

      render(<PendingTermsGate />);

      await vi.waitFor(() => {
        expect(screen.getByText('Aguardando aceite do Termo de Contratação')).toBeInTheDocument();
      });
      expect(screen.queryByRole('button', { name: /ir para o portal do cliente/i })).not.toBeInTheDocument();

      // Avança o tempo em 15s para testar o polling
      await vi.advanceTimersByTimeAsync(15000);

      // O polling deve ter atualizado o status e liberado o acesso (não renderizando mais nada)
      await vi.waitFor(() => {
        expect(screen.queryByText('Aguardando aceite do Termo de Contratação')).not.toBeInTheDocument();
      });

      expect(termsApi.getStatus).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('trata erro de rede como pendente não-acionável (fail-closed)', async () => {
    comoMock(termsApi.getStatus).mockRejectedValue(new Error('Network error'));

    render(<PendingTermsGate />);

    // Deve cair no estado fail-closed que exibe a tela de espera
    await screen.findByText('Aguardando aceite do Termo de Contratação');
    expect(screen.queryByRole('button', { name: /ir para o portal do cliente/i })).not.toBeInTheDocument();
  });

  it('adia a checagem de termos até o tenant ser resolvido (tenantsLoaded=false) e dispara assim que resolve', async () => {
    useAuthStore.setState({ tenantsLoaded: false });
    comoMock(termsApi.getStatus).mockResolvedValue({ pending: [] });

    render(<PendingTermsGate />);

    // Enquanto o tenant não resolveu, não deve chamar /me/terms/status
    expect(termsApi.getStatus).not.toHaveBeenCalled();

    // Tenant resolve (mesmo sinal que ServiceGuard usa via useTenants())
    act(() => {
      useAuthStore.setState({ tenantsLoaded: true });
    });

    await waitFor(() => {
      expect(termsApi.getStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('tenant do termo pendente e GlobalAdmin (RF-01, RF-08, RF-09)', () => {
    const getStatus = vi.mocked(termsApi.getStatus);

    afterEach(() => {
      useAuthStore.setState({ activeTenantId: null, user: null, token: null });
    });

    it('CA-01: redireciona com tenant_id e return_to, ambos codificados', async () => {
      useAuthStore.setState({ activeTenantId: 't 2&x' });
      window.location.href = 'http://localhost/posts?a=1&b=2#x y';
      getStatus.mockResolvedValue(pendingContract(true));

      render(<PendingTermsGate />);

      fireEvent.click(await screen.findByRole('button', { name: /ir para o portal do cliente/i }));

      // Valor codificado na URL: espaço e "&" não podem vazar para a query.
      expect(window.location.href).toContain('&tenant_id=t%202%26x');
      const target = new URL(window.location.href);
      expect(target.searchParams.get('tenant_id')).toBe('t 2&x');
      expect(target.searchParams.get('return_to')).toBe('http://localhost/posts?a=1&b=2#x y');
      // O "&" interno do return_to não pode virar um 3o parâmetro.
      expect(Array.from(target.searchParams.keys()).sort()).toEqual(['return_to', 'tenant_id']);
    });

    it('CA-09: sem tenant ativo, o redirecionamento leva o tenant do token (custom:tenant_id)', async () => {
      useAuthStore.setState({
        activeTenantId: null,
        token: fakeJwt({ 'custom:tenant_id': 't-3' }),
      });
      getStatus.mockResolvedValue(pendingContract(true));

      render(<PendingTermsGate />);

      fireEvent.click(await screen.findByRole('button', { name: /ir para o portal do cliente/i }));

      expect(new URL(window.location.href).searchParams.get('tenant_id')).toBe('t-3');
    });

    it('tenant ativo tem prioridade sobre o tenant do token', async () => {
      useAuthStore.setState({
        activeTenantId: 't-2',
        token: fakeJwt({ 'custom:tenant_id': 't-3' }),
      });
      getStatus.mockResolvedValue(pendingContract(true));

      render(<PendingTermsGate />);

      fireEvent.click(await screen.findByRole('button', { name: /ir para o portal do cliente/i }));

      expect(new URL(window.location.href).searchParams.get('tenant_id')).toBe('t-2');
    });

    it('token ilegível não quebra o gate: redireciona sem tenant_id', async () => {
      useAuthStore.setState({ activeTenantId: null, token: 'nao-e-jwt' });
      getStatus.mockResolvedValue(pendingContract(true));

      render(<PendingTermsGate />);

      fireEvent.click(await screen.findByRole('button', { name: /ir para o portal do cliente/i }));

      expect(new URL(window.location.href).searchParams.has('tenant_id')).toBe(false);
    });

    it('CA-10: GlobalAdmin com can_accept=false vê o aviso e não é bloqueado', async () => {
      useAuthStore.setState({ user: { email: 'ga@unum.com', groups: ['GlobalAdmin'] } });
      getStatus.mockResolvedValue(pendingContract(false));

      render(<PendingTermsGate />);

      expect(await screen.findByText(GLOBAL_ADMIN_NOTICE)).toBeInTheDocument();
      expect(screen.queryByText('Aguardando aceite do Termo de Contratação')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /ir para o portal do cliente/i })).not.toBeInTheDocument();
      expect(window.location.href).toBe('http://localhost/posts');
    });

    it('CA-10: usuário comum com can_accept=false segue o fluxo atual (tela de espera, sem aviso)', async () => {
      useAuthStore.setState({ user: { email: 'u@x.com', groups: ['TenantAdmin'] } });
      getStatus.mockResolvedValue(pendingContract(false));

      render(<PendingTermsGate />);

      expect(await screen.findByText('Aguardando aceite do Termo de Contratação')).toBeInTheDocument();
      expect(screen.queryByText(GLOBAL_ADMIN_NOTICE)).not.toBeInTheDocument();
    });

    it('GlobalAdmin com can_accept=true segue o fluxo de aceite no portal', async () => {
      useAuthStore.setState({ user: { email: 'ga@unum.com', groups: ['GlobalAdmin'] } });
      getStatus.mockResolvedValue(pendingContract(true));

      render(<PendingTermsGate />);

      expect(await screen.findByRole('button', { name: /ir para o portal do cliente/i })).toBeInTheDocument();
      expect(screen.queryByText(GLOBAL_ADMIN_NOTICE)).not.toBeInTheDocument();
    });

    it('GlobalAdmin não passa quando a consulta de status falha (fail-closed)', async () => {
      useAuthStore.setState({ user: { email: 'ga@unum.com', groups: ['GlobalAdmin'] } });
      getStatus.mockRejectedValue(new Error('Network error'));

      render(<PendingTermsGate />);

      expect(await screen.findByText('Aguardando aceite do Termo de Contratação')).toBeInTheDocument();
      expect(screen.queryByText(GLOBAL_ADMIN_NOTICE)).not.toBeInTheDocument();
    });
  });
});
