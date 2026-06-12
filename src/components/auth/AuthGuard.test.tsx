import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import AuthGuard from './AuthGuard'
import { useAuthStore } from '@/store/useAuthStore'

const pushMock = vi.fn()
let pathname = '/posts'

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({
    push: pushMock,
  }),
}))

describe('AuthGuard', () => {
  beforeEach(() => {
    pathname = '/posts'
    pushMock.mockClear()
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
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('redirects protected routes after hydration when not authenticated', async () => {
    useAuthStore.setState({ hasHydrated: true })

    render(
      <AuthGuard>
        <main>Dashboard protegido</main>
      </AuthGuard>
    )

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login'))
  })

  it('renders children if authenticated', async () => {
    useAuthStore.setState({ hasHydrated: true, isAuthenticated: true })

    render(
      <AuthGuard>
        <main>Dashboard protegido</main>
      </AuthGuard>
    )

    expect(screen.getByText('Dashboard protegido')).toBeInTheDocument()
    expect(pushMock).not.toHaveBeenCalled()
  })
})
