import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'
import React from 'react'

import PostForm from './PostForm'

const mockOnSubmit = vi.fn()

vi.mock('@/lib/api', () => ({
  blogApi: {
    getUploadURL: vi.fn().mockResolvedValue({ url: 'https://presigned-url.com' }),
  },
}))

describe('PostForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
})
