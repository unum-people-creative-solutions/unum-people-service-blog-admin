import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import AuthGuard from './AuthGuard'
import { useAuthStore } from '@/store/useAuthStore'
import { serviceAgreementApi } from '@/lib/api'

const pushMock = vi.fn()
let pathname = '/posts'

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({
    push: pushMock,
  }),
}))

vi.mock('@/lib/api', () => ({
  serviceAgreementApi: {
    getMyStatus: vi.fn(),
  },
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
    pushMock.mockClear()
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
      pathname = '/login'
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
  })
})
