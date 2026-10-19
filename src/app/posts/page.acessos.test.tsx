import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import PostsPage from './page'
import { acessosApi, blogApi, type MeusAcessos, type Post } from '@/lib/api'
import { useAuthStore } from '@/store/useAuthStore'

// spec: gestao-de-acesso-f4-aplicacao RF-06, CA-05 (Blog, lista de posts).

vi.mock('@/lib/api', async () => {
  const real = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...real,
    acessosApi: { get: vi.fn() },
    blogApi: { listPosts: vi.fn(), deletePost: vi.fn(), publishPost: vi.fn(), unpublishPost: vi.fn() },
  }
})

vi.mock('@/components/TenantSwitcher', () => ({ default: () => <div>Empresa</div> }))
vi.mock('@/lib/pkce', () => ({ logoutFromHostedUI: vi.fn() }))

const EDITOR = ['blog.post.ver', 'blog.post.criar', 'blog.post.editar_proprio', 'blog.post.editar_qualquer', 'blog.post.publicar', 'blog.post.excluir', 'blog.midia.enviar']
const REDATOR = ['blog.post.ver', 'blog.post.criar', 'blog.post.editar_proprio', 'blog.midia.enviar']

function acessos(blog: string[]): MeusAcessos {
  return {
    tenant_id: 'tenant-1',
    operador: false,
    ferramentas: [
      { id: 'portal', nome: 'Portal do Cliente', contratada: true, papel: { id: 'membro', nome: 'Membro', sistema: true, implicito: false }, permissoes: ['portal.empresa.ver'] },
      { id: 'blog', nome: 'Blog', contratada: true, papel: { id: 'p-x', nome: 'Papel', sistema: false, implicito: false }, permissoes: blog },
    ],
  }
}

// Token sem assinatura: só o sub importa para "editar os próprios posts".
function tokenCom(sub: string) {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub, email: 'ana@test.com' })}.x`
}

function post(id: string, title: string, author_id: string, status: Post['status'] = 'DRAFT'): Post {
  return { id, title, slug: id, excerpt: 'Resumo', status, author_id, tags: [], created_at: '2026-10-01T12:00:00Z', updated_at: '2026-10-01T12:00:00Z' }
}

const meu = post('post-meu', 'Meu post', 'sub-ana')
const deOutro = post('post-outro', 'Post de outra pessoa', 'sub-bia')

function renderPagina() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <PostsPage />
    </QueryClientProvider>,
  )
}

describe('Lista de posts segue as permissões do Blog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: tokenCom('sub-ana'), activeTenantId: 'tenant-1', activeTenantName: 'Loja', isAuthenticated: true, isAdmin: false })
    vi.mocked(blogApi.listPosts).mockResolvedValue({ posts: [meu, deOutro], last_key: '' })
  })

  it('Editor vê criar, publicar, excluir e editar em todos os posts', async () => {
    vi.mocked(acessosApi.get).mockResolvedValue(acessos(EDITOR))
    renderPagina()
    expect(await screen.findByRole('link', { name: 'Post de outra pessoa' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Novo Post/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Publicar Post' })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Excluir Post' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Editar Post' })).toHaveLength(2)
  })

  it('Redator cria e edita só o próprio post; não publica nem exclui', async () => {
    vi.mocked(acessosApi.get).mockResolvedValue(acessos(REDATOR))
    renderPagina()
    expect(await screen.findByRole('link', { name: 'Meu post' })).toHaveAttribute('href', '/posts/post-meu/edit')
    expect(screen.getAllByRole('link', { name: /Novo Post/i }).length).toBeGreaterThan(0)
    expect(screen.getByText('Post de outra pessoa')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Post de outra pessoa' })).not.toBeInTheDocument()
    const editar = screen.getAllByRole('link', { name: 'Editar Post' })
    expect(editar).toHaveLength(1)
    expect(editar[0]).toHaveAttribute('href', '/posts/post-meu/edit')
    expect(screen.queryByRole('button', { name: 'Publicar Post' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Excluir Post' })).not.toBeInTheDocument()
  })

  it('cada ação some sem a sua permissão: só publicar', async () => {
    vi.mocked(acessosApi.get).mockResolvedValue(acessos(['blog.post.ver', 'blog.post.publicar']))
    renderPagina()
    expect(await screen.findAllByRole('button', { name: 'Publicar Post' })).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Excluir Post' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Novo Post/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Editar Post' })).not.toBeInTheDocument()
  })

  it('cada ação some sem a sua permissão: só excluir', async () => {
    vi.mocked(acessosApi.get).mockResolvedValue(acessos(['blog.post.ver', 'blog.post.excluir']))
    renderPagina()
    expect(await screen.findAllByRole('button', { name: 'Excluir Post' })).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Publicar Post' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Novo Post/i })).not.toBeInTheDocument()
  })

  it('só com ver e lista vazia, não oferece Novo Post', async () => {
    vi.mocked(acessosApi.get).mockResolvedValue(acessos(['blog.post.ver']))
    vi.mocked(blogApi.listPosts).mockResolvedValue({ posts: [], last_key: '' })
    renderPagina()
    await waitFor(() => expect(blogApi.listPosts).toHaveBeenCalled())
    await screen.findByText(/ainda não criou posts/i)
    expect(screen.queryByRole('link', { name: /Novo Post/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Criar meu primeiro Post/i })).not.toBeInTheDocument()
  })

  it('com criar e lista vazia, oferece Criar meu primeiro Post', async () => {
    vi.mocked(acessosApi.get).mockResolvedValue(acessos(['blog.post.ver', 'blog.post.criar']))
    vi.mocked(blogApi.listPosts).mockResolvedValue({ posts: [], last_key: '' })
    renderPagina()
    expect(await screen.findByRole('link', { name: /Criar meu primeiro Post/i })).toHaveAttribute('href', '/posts/new')
  })

  it('troca de empresa relê as permissões da empresa nova', async () => {
    vi.mocked(acessosApi.get).mockResolvedValueOnce(acessos(EDITOR)).mockResolvedValueOnce(acessos(REDATOR))
    renderPagina()
    expect(await screen.findAllByRole('button', { name: 'Excluir Post' })).toHaveLength(2)
    act(() => useAuthStore.setState({ activeTenantId: 'tenant-2', activeTenantName: 'Outra' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Excluir Post' })).not.toBeInTheDocument())
    expect(acessosApi.get).toHaveBeenCalledTimes(2)
    expect(await screen.findAllByRole('link', { name: /Novo Post/i })).not.toHaveLength(0)
  })

  it('403 com permissão ao excluir também mostra a mensagem de permissão', async () => {
    vi.mocked(acessosApi.get).mockResolvedValue(acessos(EDITOR))
    vi.mocked(blogApi.deletePost).mockRejectedValue(Object.assign(new Error('forbidden'), { status: 403, permissao: 'blog.post.excluir' }))
    const user = userEvent.setup()
    renderPagina()
    const [excluir] = await screen.findAllByRole('button', { name: 'Excluir Post' })
    await user.click(excluir)
    await user.click(screen.getByRole('button', { name: /^Excluir$/ }))
    expect(await screen.findByText('Você não tem permissão para fazer isso nesta empresa.')).toBeInTheDocument()
  })

  it('sem blog.post.ver, mostra Sem acesso com o link do Portal e não lista posts', async () => {
    vi.mocked(acessosApi.get).mockResolvedValue(acessos([]))
    renderPagina()
    expect(await screen.findByRole('heading', { name: 'Você não tem acesso ao Blog nesta empresa' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir o Portal do Cliente' })).toHaveAttribute('href', 'https://customer.unumpeople.com.br')
    expect(blogApi.listPosts).not.toHaveBeenCalled()
  })

  it('enquanto as permissões carregam, nenhuma ação aparece', async () => {
    vi.mocked(acessosApi.get).mockReturnValue(new Promise(() => {}))
    renderPagina()
    await waitFor(() => expect(acessosApi.get).toHaveBeenCalled())
    expect(screen.queryByRole('link', { name: /Novo Post/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publicar Post' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Editar Post' })).not.toBeInTheDocument()
  })

  it('se a leitura das permissões falha, avisa e esconde as ações', async () => {
    vi.mocked(acessosApi.get).mockRejectedValue(new Error('rede'))
    renderPagina()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar suas permissões nesta empresa.')
    expect(screen.queryByRole('link', { name: /Novo Post/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Excluir Post' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Editar Post' })).not.toBeInTheDocument()
  })

  it('403 com permissão vindo da API mostra a mensagem de permissão', async () => {
    vi.mocked(acessosApi.get).mockResolvedValue(acessos(EDITOR))
    vi.mocked(blogApi.publishPost).mockRejectedValue(Object.assign(new Error('forbidden'), { status: 403, permissao: 'blog.post.publicar' }))
    const user = userEvent.setup()
    renderPagina()
    const [publicar] = await screen.findAllByRole('button', { name: 'Publicar Post' })
    await user.click(publicar)
    expect(await screen.findByText('Você não tem permissão para fazer isso nesta empresa.')).toBeInTheDocument()
  })
})
