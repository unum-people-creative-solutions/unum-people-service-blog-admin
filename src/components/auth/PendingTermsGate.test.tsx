import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import PendingTermsGate from './PendingTermsGate';
import { termsApi } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  termsApi: {
    getStatus: vi.fn(),
  },
}));

const originalLocation = window.location;

describe('PendingTermsGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.location.href
    // @ts-ignore
    delete window.location;
    window.location = {
      href: 'http://localhost/posts',
    } as any;
  });

  afterEach(() => {
    // @ts-ignore
    window.location = originalLocation;
  });

  it('não renderiza nada quando não há pendências (pending=[])', async () => {
    (termsApi.getStatus as any).mockResolvedValue({ pending: [] });

    const { container } = render(<PendingTermsGate />);

    await waitFor(() => {
      expect(termsApi.getStatus).toHaveBeenCalled();
    });

    expect(container.firstChild).toBeNull();
  });

  it('exibe modal com botão quando há termo pendente que pode ser aceito (can_accept=true)', async () => {
    (termsApi.getStatus as any).mockResolvedValue({
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
      (termsApi.getStatus as any)
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
    (termsApi.getStatus as any).mockRejectedValue(new Error('Network error'));

    render(<PendingTermsGate />);

    // Deve cair no estado fail-closed que exibe a tela de espera
    await screen.findByText('Aguardando aceite do Termo de Contratação');
    expect(screen.queryByRole('button', { name: /ir para o portal do cliente/i })).not.toBeInTheDocument();
  });
});
