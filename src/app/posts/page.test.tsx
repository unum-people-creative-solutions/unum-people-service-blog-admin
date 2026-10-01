import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'
import React from 'react'

import PostsPage from './page'
import { blogApi } from '@/lib/api'
import { useAuthStore } from '@/store/useAuthStore'

vi.mock('@/lib/api', () => ({
  blogApi: {
    listPosts: vi.fn(),
    deletePost: vi.fn(),
    publishPost: vi.fn(),
    unpublishPost: vi.fn(),
  },
}))

vi.mock('@/components/TenantSwitcher', () => ({
  default: ({ onTenantChange }: any) => (
    <button data-testid="tenant-switcher" onClick={onTenantChange}>
      Tenant Switcher Mock
    </button>
  ),
}))

const invalidateQueriesMock = vi.fn();

vi.mock('@tanstack/react-query', () => {
  const React = require('react')
  return {
    useQuery: ({ queryFn }: any) => {
      const [data, setData] = React.useState(null)
      const [isLoading, setIsLoading] = React.useState(true)
      React.useEffect(() => {
        queryFn().then((res: any) => {
          setData(res)
          setIsLoading(false)
        })
      }, [])
      return { data, isLoading }
    },
    useMutation: ({ mutationFn, onSuccess, onError }: any) => {
      return {
        mutate: async (args: any) => {
          try {
            await mutationFn(args)
            if (onSuccess) onSuccess()
          } catch (err) {
            if (onError) onError(err)
            else throw err
          }
        },
      }
    },
    useQueryClient: () => ({
      invalidateQueries: invalidateQueriesMock,
    }),
  }
})

describe('PostsPage', () => {
  const mockPosts = [
    {
      id: 'post-1',
      title: 'Post de Teste 1',
      slug: 'post-de-teste-1',
      excerpt: 'Resumo 1',
      status: 'DRAFT' as const,
      tags: ['go', 'aws'],
      created_at: '2026-06-11T12:00:00Z',
      author_id: 'author-1',
      updated_at: '2026-06-11T12:00:00Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(blogApi.listPosts).mockResolvedValue({
      posts: mockPosts,
      last_key: '',
    })
    
    useAuthStore.setState({
      isAdmin: true,
    })
  })

  it('renders table, search filter, and TenantSwitcher', async () => {
    render(<PostsPage />)

    await waitFor(() => {
      expect(screen.getByText('Post de Teste 1')).toBeInTheDocument()
    })

    expect(screen.getByPlaceholderText(/buscar post pelo título/i)).toBeInTheDocument()
    expect(screen.getByTestId('tenant-switcher')).toBeInTheDocument()
  })

  it('calls invalidateQueries when tenant changes', async () => {
    render(<PostsPage />)

    await waitFor(() => {
      expect(screen.getByText('Post de Teste 1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('tenant-switcher'))

    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['posts'] })
  })

  it('hides delete and publish buttons for non-admin users', async () => {
    useAuthStore.setState({ isAdmin: false })

    render(<PostsPage />)

    await waitFor(() => {
      expect(screen.getByText('Post de Teste 1')).toBeInTheDocument()
    })

    // Edit link should still be visible (has href matching /posts/post-1/edit)
    expect(screen.getByTitle('Editar Post')).toBeInTheDocument()

    // Delete and publish buttons should be hidden
    expect(screen.queryByTitle('Excluir Post')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Publicar Post')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Mudar para Rascunho')).not.toBeInTheDocument()
  })

  it('shows delete and publish buttons for admin users', async () => {
    useAuthStore.setState({ isAdmin: true })

    render(<PostsPage />)

    await waitFor(() => {
      expect(screen.getByText('Post de Teste 1')).toBeInTheDocument()
    })

    expect(screen.getByTitle('Editar Post')).toBeInTheDocument()
    expect(screen.getByTitle('Excluir Post')).toBeInTheDocument()
    expect(screen.getByTitle('Publicar Post')).toBeInTheDocument()
  })

  // Achado investigando "posts não são publicáveis": a mutação de publicar/
  // despublicar/deletar não tinha onError — um 403 do backend (ex:
  // admin_permission_required, achado em TenantAdmin x isAdmin) falhava em
  // silêncio, o post continuava do jeito que estava, sem nenhum sinal na
  // tela de que a ação tinha sido rejeitada.
  it('mostra o erro na tela quando publicar falha, em vez de falhar em silêncio', async () => {
    vi.mocked(blogApi.publishPost).mockRejectedValue(new Error('admin_permission_required'))

    render(<PostsPage />)

    await waitFor(() => {
      expect(screen.getByText('Post de Teste 1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTitle('Publicar Post'))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('admin_permission_required')
    })
  })

  it('não deixa erro residual na tela quando publicar funciona', async () => {
    vi.mocked(blogApi.publishPost).mockResolvedValue({ message: 'Post published successfully' })

    render(<PostsPage />)

    await waitFor(() => {
      expect(screen.getByText('Post de Teste 1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTitle('Publicar Post'))

    await waitFor(() => {
      expect(blogApi.publishPost).toHaveBeenCalledWith('post-1')
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('mostra o erro na tela quando despublicar falha', async () => {
    vi.mocked(blogApi.listPosts).mockResolvedValue({
      posts: [{ ...mockPosts[0], status: 'PUBLISHED' as const }],
      last_key: '',
    })
    vi.mocked(blogApi.unpublishPost).mockRejectedValue(new Error('admin_permission_required'))

    render(<PostsPage />)

    await waitFor(() => {
      expect(screen.getByText('Post de Teste 1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTitle('Mudar para Rascunho'))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('admin_permission_required')
    })
  })
})
