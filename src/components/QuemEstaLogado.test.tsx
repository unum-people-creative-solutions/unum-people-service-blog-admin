import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom'
import QuemEstaLogado from './QuemEstaLogado'
import { useAuthStore } from '@/store/useAuthStore'

// Quem está logado: o nome do id_token do Cognito ou, sem ele, o e-mail.

function token(claims: Record<string, unknown>) {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64(claims)}.x`
}

describe('QuemEstaLogado', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false })
  })

  it('mostra o nome do token, com o e-mail no title', () => {
    useAuthStore.setState({ user: { email: 'ana@clinica.com', groups: [] }, token: token({ email: 'ana@clinica.com', name: 'Ana Souza' }), isAuthenticated: true })
    render(<QuemEstaLogado />)
    expect(screen.getByText('Ana Souza')).toHaveAttribute('title', 'ana@clinica.com')
  })

  it('sem nome (ou em branco), mostra o e-mail', () => {
    useAuthStore.setState({ user: { email: 'ana@clinica.com', groups: [] }, token: token({ email: 'ana@clinica.com', name: '  ' }), isAuthenticated: true })
    render(<QuemEstaLogado />)
    expect(screen.getByText('ana@clinica.com')).toBeInTheDocument()
  })

  it('token ilegível: mostra o e-mail da sessão', () => {
    useAuthStore.setState({ user: { email: 'ana@clinica.com', groups: [] }, token: 'nao-e-jwt', isAuthenticated: true })
    render(<QuemEstaLogado />)
    expect(screen.getByText('ana@clinica.com')).toBeInTheDocument()
  })

  it('sem sessão, não mostra nada', () => {
    const { container } = render(<QuemEstaLogado />)
    expect(container).toBeEmptyDOMElement()
  })
})
