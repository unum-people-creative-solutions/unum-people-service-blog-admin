import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ServiceAgreementWaiting from './ServiceAgreementWaiting';

const mockLogoutFromHostedUI = vi.fn();
vi.mock('@/lib/pkce', () => ({
  logoutFromHostedUI: (...args: unknown[]) => mockLogoutFromHostedUI(...args),
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
  // TASK-FE-BLOG-003: não existe mais página /login própria do app — sair
  // agora manda de volta para o Hosted UI (Cognito).
  it('permite sair e voltar para o login (Hosted UI), para quem ficou preso aqui por engano', () => {
    render(<ServiceAgreementWaiting />);

    const backButton = screen.getByRole('button', { name: /sair e voltar para o login/i });
    fireEvent.click(backButton);

    expect(mockLogout).toHaveBeenCalled();
    expect(mockLogoutFromHostedUI).toHaveBeenCalled();
  });
});
