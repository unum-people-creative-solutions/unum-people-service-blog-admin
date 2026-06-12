import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'
import React from 'react'

import ServiceGuard from './ServiceGuard'
import { useAuthStore } from '@/store/useAuthStore'
import { useTenants } from '@/hooks/useTenants'

const pushMock = vi.fn()
let pathname = '/posts'

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({
    push: pushMock,
  }),
}))

vi.mock('@/hooks/useTenants', () => ({
  useTenants: vi.fn(),
}))

describe('ServiceGuard', () => {
  beforeEach(() => {
    pathname = '/posts'
    pushMock.mockClear()
    vi.clearAllMocks()

    useAuthStore.setState({
      user: { email: 'admin@unum.com', groups: [] },
      token: 'token',
      refreshToken: null,
      enabledServices: ['blog'],
      isAuthenticated: true,
      isAdmin: false,
      hasHydrated: true,
      availableTenants: [{ id: 'tenant-1', name: 'Tenant One' }],
      activeTenantId: 'tenant-1',
      activeTenantName: 'Tenant One',
      tenantsLoaded: true,
    })

    vi.mocked(useTenants).mockReturnValue({
      tenants: [{ id: 'tenant-1', name: 'Tenant One' }],
      isLoading: false,
      tenantsLoaded: true,
    })
  })

  it('keeps routes in a loading state until hydration', () => {
    useAuthStore.setState({ hasHydrated: false })

    render(
      <ServiceGuard>
        <main>Blog Admin Area</main>
      </ServiceGuard>
    )

    expect(screen.getByRole('status', { name: /verificando servicos contratados/i })).toBeInTheDocument()
    expect(screen.queryByText('Blog Admin Area')).not.toBeInTheDocument()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('keeps routes in a loading state while tenants are loading', () => {
    vi.mocked(useTenants).mockReturnValue({
      tenants: [],
      isLoading: true,
      tenantsLoaded: false,
    })

    render(
      <ServiceGuard>
        <main>Blog Admin Area</main>
      </ServiceGuard>
    )

    expect(screen.getByRole('status', { name: /verificando servicos contratados/i })).toBeInTheDocument()
    expect(screen.queryByText('Blog Admin Area')).not.toBeInTheDocument()
  })

  it('redirects to /403 if tenant list is empty after load', async () => {
    vi.mocked(useTenants).mockReturnValue({
      tenants: [],
      isLoading: false,
      tenantsLoaded: true,
    })

    render(
      <ServiceGuard>
        <main>Blog Admin Area</main>
      </ServiceGuard>
    )

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/403'))
  })

  it('allows access and renders children if tenant list is loaded and not empty', async () => {
    render(
      <ServiceGuard>
        <main>Blog Admin Area</main>
      </ServiceGuard>
    )

    expect(screen.getByText('Blog Admin Area')).toBeInTheDocument()
    expect(pushMock).not.toHaveBeenCalled()
  })
});
