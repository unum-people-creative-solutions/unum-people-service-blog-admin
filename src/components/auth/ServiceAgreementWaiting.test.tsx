import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ServiceAgreementWaiting from './ServiceAgreementWaiting';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockLogout = vi.fn();
vi.mock('@/store/useAuthStore', () => ({
  useAuthStore: () => ({ logout: mockLogout }),
}));

describe('ServiceAgreementWaiting', () => {
  it('não expõe nenhum controle de aceite — só texto informativo de espera', () => {
    render(<ServiceAgreementWaiting />);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByText(/aguardando/i)).toBeInTheDocument();
  });

  // Achado do usuário: logar com uma conta sem tenant associado prendia a
  // pessoa nesta tela para sempre — sem nenhuma forma de sair a não ser
  // encerrar a sessão manualmente (ex: limpar localStorage).
  it('permite sair e voltar para o login, para quem ficou preso aqui por engano', () => {
    render(<ServiceAgreementWaiting />);

    const backButton = screen.getByRole('button', { name: /sair e voltar para o login/i });
    fireEvent.click(backButton);

    expect(mockLogout).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
