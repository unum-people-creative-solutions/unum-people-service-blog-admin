import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import ServiceGuard from './ServiceGuard'
import { useAuthStore } from '@/store/useAuthStore'

const pushMock = vi.fn()
let pathname = '/posts'

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({
    push: pushMock,
  }),
}))

describe('ServiceGuard', () => {
  beforeEach(() => {
    pathname = '/posts'
    pushMock.mockClear()
    useAuthStore.setState({
      user: { email: 'admin@unum.com', groups: [] },
      token: 'token',
      refreshToken: null,
      enabledServices: [],
      isAuthenticated: true,
      isAdmin: false,
      hasHydrated: false,
    })
  })

  it('keeps routes in a loading state until hydration', () => {
    render(
      <ServiceGuard>
        <main>Blog Admin Area</main>
      </ServiceGuard>
    )

    expect(screen.getByRole('status', { name: /verificando servicos contratados/i })).toBeInTheDocument()
    expect(screen.queryByText('Blog Admin Area')).not.toBeInTheDocument()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('redirects to /403 if tenant does not have blog service enabled', async () => {
    useAuthStore.setState({ hasHydrated: true })

    render(
      <ServiceGuard>
        <main>Blog Admin Area</main>
      </ServiceGuard>
    )

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/403'))
  })

  it('allows access and renders children if tenant has blog service enabled', async () => {
    useAuthStore.setState({ hasHydrated: true, enabledServices: ['blog'] })

    render(
      <ServiceGuard>
        <main>Blog Admin Area</main>
      </ServiceGuard>
    )

    expect(screen.getByText('Blog Admin Area')).toBeInTheDocument()
    expect(pushMock).not.toHaveBeenCalled()
  })
})
