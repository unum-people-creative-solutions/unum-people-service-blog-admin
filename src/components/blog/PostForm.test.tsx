import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'
import React from 'react'

import PostForm from './PostForm'
import { useAuthStore } from '@/store/useAuthStore'

const mockOnSubmit = vi.fn()

vi.mock('@/lib/api', () => ({
  blogApi: {
    getUploadURL: vi.fn().mockResolvedValue({ url: 'https://presigned-url.com' }),
  },
}))

describe('PostForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      isAdmin: true,
    })
  })

  it('renders all form inputs and editor', () => {
    render(<PostForm onSubmit={mockOnSubmit} isLoading={false} />)

    expect(screen.getByLabelText(/título do post/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/slug do post/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/resumo \(excerpt\)/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/digite o conteúdo em markdown/i)).toBeInTheDocument()
    expect(screen.getByText(/adicionar tag/i)).toBeInTheDocument()
  })

  it('auto-generates slug from title', async () => {
    render(<PostForm onSubmit={mockOnSubmit} isLoading={false} />)

    const titleInput = screen.getByLabelText(/título do post/i)
    const slugInput = screen.getByLabelText(/slug do post/i) as HTMLInputElement

    fireEvent.change(titleInput, { target: { value: 'Minha Incrível Jornada' } })

    // O slug deve ser autogerado e normalizado (sem acentos, minúsculas, hífens)
    await waitFor(() => {
      expect(slugInput.value).toBe('minha-incrivel-jornada')
    })
  })

  it('hides Save and Publish button for non-admin users', () => {
    useAuthStore.setState({ isAdmin: false })

    render(<PostForm onSubmit={mockOnSubmit} isLoading={false} />)

    expect(screen.queryByRole('button', { name: /salvar e publicar/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /salvar post/i })).toBeInTheDocument()
  })

  it('shows Save and Publish button for admin users and submits with PUBLISHED status', async () => {
    useAuthStore.setState({ isAdmin: true })

    render(<PostForm onSubmit={mockOnSubmit} isLoading={false} />)

    const saveAndPublishBtn = screen.getByRole('button', { name: /salvar e publicar/i })
    expect(saveAndPublishBtn).toBeInTheDocument()

    // Fill form to pass schema validation
    fireEvent.change(screen.getByLabelText(/título do post/i), { target: { value: 'Novo Título Legal' } })
    fireEvent.change(screen.getByLabelText(/resumo \(excerpt\)/i), { target: { value: 'Este é um excelente resumo com mais de dez caracteres.' } })
    fireEvent.change(screen.getByPlaceholderText(/digite o conteúdo em markdown/i), { target: { value: 'Este é o conteúdo do post que precisa ter mais de vinte caracteres.' } })

    fireEvent.click(saveAndPublishBtn)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Novo Título Legal',
          status: 'PUBLISHED',
        })
      )
    })
  })
})
