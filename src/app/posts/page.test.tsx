import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'
import React from 'react'

import PostsPage from './page'
import { blogApi } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  blogApi: {
    listPosts: vi.fn(),
    deletePost: vi.fn(),
    publishPost: vi.fn(),
    unpublishPost: vi.fn(),
  },
}))

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
    useMutation: ({ mutationFn, onSuccess }: any) => {
      return {
        mutate: async (args: any) => {
          await mutationFn(args)
          if (onSuccess) onSuccess()
        },
      }
    },
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
  }
})

describe('PostsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders table with post items and search filter', async () => {
    const mockPosts = [
      {
        id: 'post-1',
        title: 'Post de Teste 1',
        slug: 'post-de-teste-1',
        excerpt: 'Resumo 1',
        status: 'DRAFT',
        tags: ['go', 'aws'],
        created_at: '2026-06-11T12:00:00Z',
      },
      {
        id: 'post-2',
        title: 'Como usar Terraform',
        slug: 'como-usar-terraform',
        excerpt: 'Resumo 2',
        status: 'PUBLISHED',
        tags: ['terraform'],
        created_at: '2026-06-10T12:00:00Z',
      },
    ]

    vi.mocked(blogApi.listPosts).mockResolvedValue({
      posts: mockPosts,
      last_key: '',
    })

    render(<PostsPage />)

    // Wait for the query to resolve
    await waitFor(() => {
      expect(screen.getByText('Post de Teste 1')).toBeInTheDocument()
    })

    expect(screen.getByText('Como usar Terraform')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/buscar post pelo título/i)).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})
