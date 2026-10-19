import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import NewPostPage from './new/page'
import EditPostPage from './[id]/edit/page'
import { acessosApi, blogApi, type MeusAcessos, type Post } from '@/lib/api'
import { useAuthStore } from '@/store/useAuthStore'

// spec: gestao-de-acesso-f4-aplicacao RF-06 — no editor, o envio de imagem exige blog.midia.enviar.

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ id: 'post-1' }),
}))

vi.mock('@/lib/api', async () => {
  const real = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return { ...real, acessosApi: { get: vi.fn() }, blogApi: { getPost: vi.fn(), createPost: vi.fn(), updatePost: vi.fn() } }
})

function acessos(blog: string[]): MeusAcessos {
  return {
    tenant_id: 'tenant-1',
    operador: false,
    ferramentas: [{ id: 'blog', nome: 'Blog', contratada: true, papel: { id: 'p-x', nome: 'Papel', sistema: false, implicito: false }, permissoes: blog }],
  }
}

const postDoBlog: Post = { id: 'post-1', title: 'Post', slug: 'post', excerpt: 'Resumo', status: 'DRAFT', author_id: 'sub-ana', content_md: 'Texto', tags: [], created_at: '2026-10-01T12:00:00Z', updated_at: '2026-10-01T12:00:00Z' }

function comQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('Editor: envio de imagem segue blog.midia.enviar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: 'tok', activeTenantId: 'tenant-1', activeTenantName: 'Loja', isAuthenticated: true })
    vi.mocked(blogApi.getPost).mockResolvedValue(postDoBlog)
  })

  for (const [nome, pagina] of [['novo post', <NewPostPage key="n2" />], ['editar post', <EditPostPage key="e2" />]] as const) {
    it(`${nome}: Salvar e Publicar só com blog.post.publicar`, async () => {
      vi.mocked(acessosApi.get).mockResolvedValue(acessos(['blog.post.ver', 'blog.post.criar', 'blog.post.editar_proprio', 'blog.post.publicar']))
      const { unmount } = comQuery(pagina)
      expect(await screen.findByRole('button', { name: /Salvar e Publicar/i })).toBeInTheDocument()
      unmount()

      vi.mocked(acessosApi.get).mockResolvedValue(acessos(['blog.post.ver', 'blog.post.criar', 'blog.post.editar_proprio']))
      useAuthStore.setState({ isAdmin: true })
      comQuery(pagina)
      expect(await screen.findByRole('button', { name: /Salvar Post/i })).toBeInTheDocument()
      await new Promise((r) => setTimeout(r, 0))
      expect(screen.queryByRole('button', { name: /Salvar e Publicar/i })).not.toBeInTheDocument()
    })
  }

  for (const [nome, pagina] of [['novo post', <NewPostPage key="n" />], ['editar post', <EditPostPage key="e" />]] as const) {
    it(`${nome}: com a permissão, oferece o envio`, async () => {
      vi.mocked(acessosApi.get).mockResolvedValue(acessos(['blog.post.ver', 'blog.post.criar', 'blog.post.editar_proprio', 'blog.midia.enviar']))
      comQuery(pagina)
      expect(await screen.findByRole('button', { name: /fazer upload de imagem/i })).toBeInTheDocument()
    })

    it(`${nome}: sem a permissão, não oferece o envio`, async () => {
      vi.mocked(acessosApi.get).mockResolvedValue(acessos(['blog.post.ver', 'blog.post.criar', 'blog.post.editar_proprio']))
      comQuery(pagina)
      expect(await screen.findByRole('button', { name: /Vídeo YouTube/i })).toBeInTheDocument()
      await new Promise((r) => setTimeout(r, 0))
      expect(screen.queryByRole('button', { name: /fazer upload de imagem/i })).not.toBeInTheDocument()
    })
  }
})
