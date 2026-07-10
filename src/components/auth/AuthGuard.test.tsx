import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import AuthGuard from './AuthGuard'
import { useAuthStore } from '@/store/useAuthStore'
import { serviceAgreementApi } from '@/lib/api'
import { redirectToHostedUI } from '@/lib/pkce'

let pathname = '/posts'

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}))

vi.mock('@/lib/api', () => ({
  serviceAgreementApi: {
    getMyStatus: vi.fn(),
  },
}))

vi.mock('@/lib/pkce', () => ({
  redirectToHostedUI: vi.fn(),
}))

vi.mock('./ServiceAgreementGate', () => ({
  default: ({ onAccepted }: { onAccepted: () => void }) => (
    <div data-testid="service-agreement-gate">
      <button onClick={onAccepted}>Accept Agreement</button>
    </div>
  ),
}))

vi.mock('./ServiceAgreementWaiting', () => ({
  default: () => <div data-testid="service-agreement-waiting" />,
}))

describe('AuthGuard', () => {
  beforeEach(() => {
    pathname = '/posts'
    vi.clearAllMocks()
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      enabledServices: [],
      isAuthenticated: false,
      isAdmin: false,
      hasHydrated: false,
    })
    // Default: aceite em dia, sem gate — testes que não são sobre a feature
    // de Termo de Contratação não precisam se preocupar com isso.
    ;(serviceAgreementApi.getMyStatus as any).mockResolvedValue({
      status: 'aceito',
      term_name: '',
      required_version: 1,
      document_url: '',
      can_accept: true,
    })
  })

  it('keeps protected routes in an accessible loading state until auth storage hydrates', () => {
    render(
      <AuthGuard>
        <main>Dashboard protegido</main>
      </AuthGuard>
    )

    expect(screen.getByRole('status', { name: /validando sessao/i })).toBeInTheDocument()
    expect(screen.queryByText('Dashboard protegido')).not.toBeInTheDocument()
    expect(redirectToHostedUI).not.toHaveBeenCalled()
  })

  // TASK-FE-BLOG-003: não existe mais página /login própria do app.
  it('redirects protected routes to the Hosted UI (Cognito) after hydration when not authenticated', async () => {
    useAuthStore.setState({ hasHydrated: true })

    render(
      <AuthGuard>
        <main>Dashboard protegido</main>
      </AuthGuard>
    )

    await waitFor(() => expect(redirectToHostedUI).toHaveBeenCalledWith('/posts'))
  })

  it('renders children if authenticated', async () => {
    useAuthStore.setState({ hasHydrated: true, isAuthenticated: true })

    render(
      <AuthGuard>
        <main>Dashboard protegido</main>
      </AuthGuard>
    )

    expect(screen.getByText('Dashboard protegido')).toBeInTheDocument()
    expect(redirectToHostedUI).not.toHaveBeenCalled()
  })

  describe('TASK-FE-008 — Termo de Contratação de Serviço', () => {
    it('exibe o ServiceAgreementGate quando status=pendente e can_accept=true (TenantAdmin)', async () => {
      useAuthStore.setState({ hasHydrated: true, isAuthenticated: true })
      ;(serviceAgreementApi.getMyStatus as any).mockResolvedValue({
        status: 'pendente',
        term_name: 'Termo Blog',
        required_version: 1,
        document_url: 'https://cdn/v1.html',
        can_accept: true,
      })

      render(
        <AuthGuard>
          <main>Dashboard protegido</main>
        </AuthGuard>
      )

      await waitFor(() => {
        expect(screen.getByTestId('service-agreement-gate')).toBeInTheDocument()
      })
      expect(screen.queryByTestId('service-agreement-waiting')).not.toBeInTheDocument()
    })

    it('exibe o ServiceAgreementWaiting quando status=pendente e can_accept=false (usuário comum)', async () => {
      useAuthStore.setState({ hasHydrated: true, isAuthenticated: true })
      ;(serviceAgreementApi.getMyStatus as any).mockResolvedValue({
        status: 'pendente',
        term_name: 'Termo Blog',
        required_version: 1,
        document_url: 'https://cdn/v1.html',
        can_accept: false,
      })

      render(
        <AuthGuard>
          <main>Dashboard protegido</main>
        </AuthGuard>
      )

      await waitFor(() => {
        expect(screen.getByTestId('service-agreement-waiting')).toBeInTheDocument()
      })
      expect(screen.queryByTestId('service-agreement-gate')).not.toBeInTheDocument()
    })

    it('não exibe nenhum gate quando status=aceito', async () => {
      useAuthStore.setState({ hasHydrated: true, isAuthenticated: true })

      render(
        <AuthGuard>
          <main>Dashboard protegido</main>
        </AuthGuard>
      )

      await waitFor(() => {
        expect(screen.getByText('Dashboard protegido')).toBeInTheDocument()
      })
      expect(screen.queryByTestId('service-agreement-gate')).not.toBeInTheDocument()
      expect(screen.queryByTestId('service-agreement-waiting')).not.toBeInTheDocument()
    })

    it('fecha o gate quando onAccepted é chamado (aceite confirmado)', async () => {
      useAuthStore.setState({ hasHydrated: true, isAuthenticated: true })
      ;(serviceAgreementApi.getMyStatus as any).mockResolvedValue({
        status: 'pendente',
        term_name: 'Termo Blog',
        required_version: 1,
        document_url: 'https://cdn/v1.html',
        can_accept: true,
      })

      render(
        <AuthGuard>
          <main>Dashboard protegido</main>
        </AuthGuard>
      )

      const acceptBtn = await screen.findByText('Accept Agreement')
      acceptBtn.click()

      await waitFor(() => {
        expect(screen.queryByTestId('service-agreement-gate')).not.toBeInTheDocument()
      })
    })

    it('não busca o status do termo em rotas públicas', async () => {
      pathname = '/403'
      useAuthStore.setState({ hasHydrated: true, isAuthenticated: false })

      render(
        <AuthGuard>
          <main>Dashboard protegido</main>
        </AuthGuard>
      )

      await waitFor(() => {
        expect(screen.getByText('Dashboard protegido')).toBeInTheDocument()
      })
      expect(serviceAgreementApi.getMyStatus).not.toHaveBeenCalled()
    })

    // Achado do /local-review: falha ao buscar o status inicial resultava em
    // "fail-open" — contraria D6 ("enforcement real"). Deve ser fail-closed.
    it('erro ao buscar o status inicial bloqueia (fail-closed), nunca libera o acesso', async () => {
      useAuthStore.setState({ hasHydrated: true, isAuthenticated: true })
      ;(serviceAgreementApi.getMyStatus as any).mockRejectedValue(new Error('network error'))

      render(
        <AuthGuard>
          <main>Dashboard protegido</main>
        </AuthGuard>
      )

      await waitFor(() => {
        expect(screen.getByTestId('service-agreement-waiting')).toBeInTheDocument()
      })
      expect(screen.queryByTestId('service-agreement-gate')).not.toBeInTheDocument()
    })

    // SUG-3 (/local-review): quem aceita é o TenantAdmin, em outra sessão —
    // a tela de espera precisa se auto-atualizar (polling), não depender de
    // um F5 manual do usuário comum bloqueado.
    it('faz polling do status enquanto aguarda e libera o acesso assim que o TenantAdmin aceita', async () => {
      useAuthStore.setState({ hasHydrated: true, isAuthenticated: true })
      vi.useFakeTimers()
      try {
        ;(serviceAgreementApi.getMyStatus as any)
          .mockResolvedValueOnce({
            status: 'pendente',
            term_name: 'Termo Blog',
            required_version: 1,
            document_url: 'https://cdn/v1.html',
            can_accept: false,
          })
          .mockResolvedValue({
            status: 'aceito',
            term_name: 'Termo Blog',
            required_version: 1,
            document_url: 'https://cdn/v1.html',
            can_accept: false,
          })

        render(
          <AuthGuard>
            <main>Dashboard protegido</main>
          </AuthGuard>
        )

        await vi.waitFor(() => {
          expect(screen.getByTestId('service-agreement-waiting')).toBeInTheDocument()
        })

        await vi.advanceTimersByTimeAsync(15000)

        await vi.waitFor(() => {
          expect(screen.queryByTestId('service-agreement-waiting')).not.toBeInTheDocument()
        })
        expect(serviceAgreementApi.getMyStatus).toHaveBeenCalledTimes(2)
      } finally {
        vi.useRealTimers()
      }
    })
  })
})
