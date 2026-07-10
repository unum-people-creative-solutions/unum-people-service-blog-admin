import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import ServiceAgreementGate from './ServiceAgreementGate';
import { serviceAgreementApi } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  serviceAgreementApi: {
    accept: vi.fn(),
  },
}));

const baseStatus = {
  status: 'pendente' as const,
  term_name: 'Termo Blog',
  required_version: 1,
  document_url: 'https://cdn.example.com/terms/term-2/v1.html',
  can_accept: true,
};

describe('ServiceAgreementGate', () => {
  it('mantém o botão desabilitado até marcar o checkbox', () => {
    render(<ServiceAgreementGate status={baseStatus} onAccepted={vi.fn()} />);
    expect(screen.getByRole('button', { name: /concordar e continuar/i })).toBeDisabled();
  });

  it('habilita o botão ao marcar o checkbox e chama accept com a versão exigida', async () => {
    const user = userEvent.setup();
    (serviceAgreementApi.accept as any).mockResolvedValue(undefined);
    const onAccepted = vi.fn();

    render(<ServiceAgreementGate status={baseStatus} onAccepted={onAccepted} />);

    await user.click(screen.getByRole('checkbox'));
    const button = screen.getByRole('button', { name: /concordar e continuar/i });
    expect(button).not.toBeDisabled();

    await user.click(button);

    await waitFor(() => {
      expect(serviceAgreementApi.accept).toHaveBeenCalledWith(1);
      expect(onAccepted).toHaveBeenCalled();
    });
  });

  it('erro de rede mantém bloqueado e mostra mensagem, nunca fecha silenciosamente', async () => {
    const user = userEvent.setup();
    (serviceAgreementApi.accept as any).mockRejectedValue(new Error('network error'));
    const onAccepted = vi.fn();

    render(<ServiceAgreementGate status={baseStatus} onAccepted={onAccepted} />);

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /concordar e continuar/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onAccepted).not.toHaveBeenCalled();
  });

  it('exibe um link para o documento do termo', () => {
    render(<ServiceAgreementGate status={baseStatus} onAccepted={vi.fn()} />);
    const link = screen.getByRole('link', { name: /ler o termo de contratação/i });
    expect(link).toHaveAttribute('href', baseStatus.document_url);
  });
});
