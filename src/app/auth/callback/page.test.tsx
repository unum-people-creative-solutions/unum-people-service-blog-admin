import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AuthCallbackPage from './page';
import { useRouter, useSearchParams } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { useAuthStore } from '@/store/useAuthStore';
import { blogApi } from '@/lib/api';
import { exchangeCodeForTokens, redirectToHostedUI } from '@/lib/pkce';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock('jwt-decode', () => ({
  jwtDecode: vi.fn(),
}));

const mockSetAuth = vi.fn();
const mockLogout = vi.fn();
vi.mock('@/store/useAuthStore', () => ({
  useAuthStore: Object.assign(
    (selector: any) => selector({ setAuth: mockSetAuth }),
    { getState: () => ({ logout: mockLogout }) }
  ),
}));

vi.mock('@/lib/api', () => ({
  blogApi: {
    listPosts: vi.fn(),
  },
}));

vi.mock('@/lib/pkce', () => ({
  exchangeCodeForTokens: vi.fn(),
  redirectToHostedUI: vi.fn(),
  PKCE_VERIFIER_STORAGE_KEY: 'pkce_code_verifier',
  AUTH_RETURN_TO_STORAGE_KEY: 'auth_return_to',
}));

describe('AuthCallbackPage (TASK-FE-BLOG-002)', () => {
  const mockPush = vi.fn();

  const makeSearchParams = (code: string | null) => ({
    get: (key: string) => (key === 'code' ? code : null),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    (useRouter as any).mockReturnValue({ push: mockPush });
    (jwtDecode as any).mockReturnValue({
      email: 'editor@example.com',
      'cognito:groups': [],
    });
    (exchangeCodeForTokens as any).mockResolvedValue({
      id_token: 'id-token-abc',
      access_token: 'access-token-abc',
      refresh_token: 'refresh-token-abc',
      expires_in: 3600,
      token_type: 'Bearer',
    });
  });

  it('exibe erro e não troca código quando o code_verifier não está em sessionStorage', async () => {
    (useSearchParams as any).mockReturnValue(makeSearchParams('auth-code-123'));

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(screen.getByText(/sessão de login inválida ou expirada/i)).toBeInTheDocument();
    });
    expect(exchangeCodeForTokens).not.toHaveBeenCalled();
    expect(mockSetAuth).not.toHaveBeenCalled();
  });

  it('consome o code_verifier uma única vez (removido de sessionStorage após a leitura)', async () => {
    window.sessionStorage.setItem('pkce_code_verifier', 'verifier-abc');
    (useSearchParams as any).mockReturnValue(makeSearchParams('auth-code-123'));
    (blogApi.listPosts as any).mockResolvedValue({ posts: [], last_key: '' });

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(exchangeCodeForTokens).toHaveBeenCalled();
    });
    expect(window.sessionStorage.getItem('pkce_code_verifier')).toBeNull();
  });

  it('GlobalAdmin/Admins/TenantAdmin têm bypass — nunca chamam a sondagem listPosts e vão para /posts', async () => {
    window.sessionStorage.setItem('pkce_code_verifier', 'verifier-abc');
    (useSearchParams as any).mockReturnValue(makeSearchParams('auth-code-123'));
    (jwtDecode as any).mockReturnValue({ email: 'admin@example.com', 'cognito:groups': ['GlobalAdmin'] });

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/posts');
    });
    expect(blogApi.listPosts).not.toHaveBeenCalled();
    expect(mockSetAuth).toHaveBeenLastCalledWith(
      { email: 'admin@example.com', groups: ['GlobalAdmin'] },
      'id-token-abc',
      ['blog'],
      'refresh-token-abc'
    );
  });

  it('usuário comum com acesso ao blog (sondagem listPosts OK) vai para /posts', async () => {
    window.sessionStorage.setItem('pkce_code_verifier', 'verifier-abc');
    (useSearchParams as any).mockReturnValue(makeSearchParams('auth-code-123'));
    (blogApi.listPosts as any).mockResolvedValue({ posts: [], last_key: '' });

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(blogApi.listPosts).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/posts');
    });
  });

  it('usuário comum sem serviço de blog (sondagem retorna 403) vai para /403', async () => {
    window.sessionStorage.setItem('pkce_code_verifier', 'verifier-abc');
    (useSearchParams as any).mockReturnValue(makeSearchParams('auth-code-123'));
    (blogApi.listPosts as any).mockRejectedValue(new Error('HTTP error! status: 403'));

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/403');
    });
  });

  // Comportamento preservado do login SRP antigo: um erro que NÃO seja 403 na
  // sondagem (ex.: instabilidade de rede) libera acesso por padrão em vez de
  // bloquear — preservado tal como estava, não é uma decisão nova desta task.
  it('erro não-403 na sondagem libera acesso (comportamento preservado do fluxo antigo)', async () => {
    window.sessionStorage.setItem('pkce_code_verifier', 'verifier-abc');
    (useSearchParams as any).mockReturnValue(makeSearchParams('auth-code-123'));
    (blogApi.listPosts as any).mockRejectedValue(new Error('network error'));

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/posts');
    });
  });

  it('redireciona para a rota originalmente pretendida quando o acesso é concedido', async () => {
    window.sessionStorage.setItem('pkce_code_verifier', 'verifier-abc');
    window.sessionStorage.setItem('auth_return_to', '/posts/123/edit');
    (useSearchParams as any).mockReturnValue(makeSearchParams('auth-code-123'));
    (blogApi.listPosts as any).mockResolvedValue({ posts: [], last_key: '' });

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/posts/123/edit');
    });
  });

  it('falha na troca de código nunca autentica silenciosamente — mostra erro e desloga', async () => {
    window.sessionStorage.setItem('pkce_code_verifier', 'verifier-abc');
    (useSearchParams as any).mockReturnValue(makeSearchParams('auth-code-123'));
    (exchangeCodeForTokens as any).mockRejectedValue(new Error('invalid_grant'));

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(screen.getByText(/não foi possível concluir o login/i)).toBeInTheDocument();
    });
    expect(mockSetAuth).not.toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalled();
  });

  it('botão de "tentar novamente" no erro aciona redirectToHostedUI', async () => {
    (useSearchParams as any).mockReturnValue(makeSearchParams(null));

    render(<AuthCallbackPage />);

    const retryButton = await screen.findByText(/tentar novamente/i);
    retryButton.click();

    expect(redirectToHostedUI).toHaveBeenCalled();
  });
});
