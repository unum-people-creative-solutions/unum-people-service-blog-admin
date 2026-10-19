import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import EditPostPage from './page'
import { acessosApi, blogApi, type MeusAcessos, type Post } from '@/lib/api'
import { useAuthStore } from '@/store/useAuthStore'

// Bug: na edição, "Salvar e Publicar" mandava status PUBLISHED no PUT, que a API
// ignora — o post ficava rascunho. Agora salva e publica pela rota de publicar.

const push = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useParams: () => ({ id: 'post-1' }),
}))

vi.mock('@/lib/api', async () => {
  const real = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...real,
    acessosApi: { get: vi.fn() },
    blogApi: { getPost: vi.fn(), updatePost: vi.fn(), publishPost: vi.fn() },
  }
})

const editor: MeusAcessos = {
  tenant_id: 'tenant-1',
  operador: false,
  ferramentas: [
    {
      id: 'blog',
      nome: 'Blog',
      contratada: true,
      papel: { id: 'editor', nome: 'Editor', sistema: true, implicito: false },
      permissoes: ['blog.post.ver', 'blog.post.criar', 'blog.post.editar_proprio', 'blog.post.editar_qualquer', 'blog.post.publicar'],
    },
  ],
}

function post(status: Post['status']): Post {
  return {
    id: 'post-1',
    title: 'Como cuidar da ansiedade',
    slug: 'como-cuidar-da-ansiedade',
    excerpt: 'Um resumo com mais de dez caracteres.',
    content_md: 'Conteúdo do post com mais de vinte caracteres.',
    status,
    author_id: 'sub-ana',
    tags: [],
    created_at: '2026-10-01T12:00:00Z',
    updated_at: '2026-10-01T12:00:00Z',
  }
}

function renderEdicao() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <EditPostPage />
    </QueryClientProvider>,
  )
}

describe('Editar post: Salvar e Publicar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: 'tok', activeTenantId: 'tenant-1', activeTenantName: 'Loja', isAuthenticated: true })
    vi.mocked(acessosApi.get).mockResolvedValue(editor)
    vi.mocked(blogApi.updatePost).mockImplementation(async (id, dados) => ({ ...post('DRAFT'), ...dados, id }))
    vi.mocked(blogApi.publishPost).mockResolvedValue({ message: 'Post published successfully' })
  })

  it('rascunho: salva e depois publica pela rota de publicar, e volta à lista', async () => {
    vi.mocked(blogApi.getPost).mockResolvedValue(post('DRAFT'))
    const user = userEvent.setup()
    renderEdicao()
    await user.click(await screen.findByRole('button', { name: /Salvar e Publicar/i }))

    await waitFor(() => expect(blogApi.publishPost).toHaveBeenCalledWith('post-1'))
    expect(blogApi.updatePost).toHaveBeenCalledTimes(1)
    const [id, dados] = vi.mocked(blogApi.updatePost).mock.calls[0]
    expect(id).toBe('post-1')
    // O PUT não leva status: quem publica é a rota de publicar.
    expect(dados).not.toHaveProperty('status')
    expect(vi.mocked(blogApi.updatePost).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(blogApi.publishPost).mock.invocationCallOrder[0],
    )
    await waitFor(() => expect(push).toHaveBeenCalledWith('/posts'))
  })

  it('post já publicado: só salva', async () => {
    vi.mocked(blogApi.getPost).mockResolvedValue(post('PUBLISHED'))
    const user = userEvent.setup()
    renderEdicao()
    await user.click(await screen.findByRole('button', { name: /Salvar e Publicar/i }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/posts'))
    expect(blogApi.updatePost).toHaveBeenCalledTimes(1)
    expect(blogApi.publishPost).not.toHaveBeenCalled()
  })

  it('Salvar Post não publica', async () => {
    vi.mocked(blogApi.getPost).mockResolvedValue(post('DRAFT'))
    const user = userEvent.setup()
    renderEdicao()
    await user.click(await screen.findByRole('button', { name: /^Salvar Post$/i }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/posts'))
    expect(blogApi.publishPost).not.toHaveBeenCalled()
  })

  it('se salvar falha, não tenta publicar e mostra o erro', async () => {
    vi.mocked(blogApi.getPost).mockResolvedValue(post('DRAFT'))
    vi.mocked(blogApi.updatePost).mockRejectedValue(new Error('slug "x" is already in use'))
    const user = userEvent.setup()
    renderEdicao()
    await user.click(await screen.findByRole('button', { name: /Salvar e Publicar/i }))

    expect(await screen.findByText(/slug "x" is already in use/)).toBeInTheDocument()
    expect(blogApi.publishPost).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it('se publicar falha, avisa que salvou mas não publicou, e fica na tela', async () => {
    vi.mocked(blogApi.getPost).mockResolvedValue(post('DRAFT'))
    vi.mocked(blogApi.publishPost).mockRejectedValue(Object.assign(new Error('forbidden'), { status: 403, permissao: 'blog.post.publicar' }))
    const user = userEvent.setup()
    renderEdicao()
    await user.click(await screen.findByRole('button', { name: /Salvar e Publicar/i }))

    expect(await screen.findByText(/As alterações foram salvas, mas o post não foi publicado\./)).toBeInTheDocument()
    expect(screen.getByText(/Você não tem permissão para fazer isso nesta empresa\./)).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })
})
