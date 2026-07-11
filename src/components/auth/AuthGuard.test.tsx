import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import AuthGuard from './AuthGuard'
import { useAuthStore } from '@/store/useAuthStore'
import { redirectToHostedUI } from '@/lib/pkce'

let pathname = '/posts'

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}))

vi.mock('@/lib/pkce', () => ({
  redirectToHostedUI: vi.fn(),
}))

vi.mock('./PendingTermsGate', () => ({
  default: () => <div data-testid="pending-terms-gate" />,
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

  describe('PendingTermsGate Integration', () => {
    it('exibe o PendingTermsGate em rotas protegidas quando autenticado', async () => {
      useAuthStore.setState({ hasHydrated: true, isAuthenticated: true })

      render(
        <AuthGuard>
          <main>Dashboard protegido</main>
        </AuthGuard>
      )

      expect(screen.getByTestId('pending-terms-gate')).toBeInTheDocument()
    })

    it('não exibe o PendingTermsGate em rotas públicas', async () => {
      pathname = '/403'
      useAuthStore.setState({ hasHydrated: true, isAuthenticated: false })

      render(
        <AuthGuard>
          <main>Dashboard protegido</main>
        </AuthGuard>
      )

      expect(screen.getByText('Dashboard protegido')).toBeInTheDocument()
      expect(screen.queryByTestId('pending-terms-gate')).not.toBeInTheDocument()
    })
  })
})
