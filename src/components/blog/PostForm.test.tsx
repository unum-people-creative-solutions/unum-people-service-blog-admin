import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'
import React from 'react'

import PostForm from './PostForm'
import { clearSessionImageUrls, isSessionImageUrl } from '@/lib/sessionImageUrls'
import { useAuthStore } from '@/store/useAuthStore'

const mockOnSubmit = vi.fn()

const PUBLIC_URL = 'https://cdn.example/optimized/tenant/abc.webp'
const UPLOAD_URL = 'https://bucket.s3.example/incoming/tenant/abc?X-Amz-Signature=secret'

class ControlledXHR {
  status = 0
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  upload = { onprogress: null as ((event: ProgressEvent) => void) | null }
  open = vi.fn()
  setRequestHeader = vi.fn()
  send = vi.fn()
}

function installXHR() {
  const created: ControlledXHR[] = []
  class XHR extends ControlledXHR {
    constructor() {
      super()
      created.push(this)
    }
  }
  vi.stubGlobal('XMLHttpRequest', XHR)
  return created
}

function imageFile() {
  return new File([new Uint8Array(4321)], 'foto.png', { type: 'image/png' })
}

function presignResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

async function chooseCover(file: File = imageFile()) {
  const input = document.querySelector('input[type="file"]')
  if (!input) throw new Error('input de arquivo ausente')
  fireEvent.change(input, { target: { files: [file] } })
  return file
}

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

  describe('upload da capa', () => {
    const fetchMock = vi.fn()

    beforeEach(() => {
      fetchMock.mockReset()
      clearSessionImageUrls()
      vi.stubGlobal('fetch', fetchMock)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('envia size igual a file.size e só grava a public_url depois do PUT 200', async () => {
      fetchMock.mockResolvedValue(
        presignResponse(200, { upload_url: UPLOAD_URL, public_url: PUBLIC_URL }),
      )
      const xhrs = installXHR()
      const file = imageFile()

      render(<PostForm onSubmit={mockOnSubmit} isLoading={false} />)
      await chooseCover(file)

      await waitFor(() => expect(fetchMock).toHaveBeenCalled())
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(String(fetchMock.mock.calls[0][0])).toContain('/admin/blog/media/upload-url')
      expect(init.method).toBe('POST')
      expect(JSON.parse(String(init.body))).toEqual({
        filename: 'foto.png',
        content_type: 'image/png',
        size: file.size,
      })

      await waitFor(() => expect(xhrs).toHaveLength(1))
      expect(screen.queryByRole('img', { name: 'Capa do post' })).not.toBeInTheDocument()
      expect(xhrs[0]!.open).toHaveBeenCalledWith('PUT', UPLOAD_URL, true)

      xhrs[0]!.status = 200
      xhrs[0]!.onload?.()

      const capa = await screen.findByRole('img', { name: 'Capa do post' })
      expect(capa).toHaveAttribute('src', PUBLIC_URL)
    })

    it.each([
      [400, 'unsupported_type'],
      [413, 'payload_too_large'],
    ])('mostra o erro %s e não grava a capa', async (status, erro) => {
      fetchMock.mockResolvedValue(presignResponse(status, { error: erro }))
      const xhrs = installXHR()

      render(<PostForm onSubmit={mockOnSubmit} isLoading={false} />)
      await chooseCover()

      expect(await screen.findByText(erro)).toBeInTheDocument()
      expect(screen.queryByRole('img', { name: 'Capa do post' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /fazer upload de imagem/i })).toBeInTheDocument()
      expect(xhrs).toHaveLength(0)
    })

    it('registra a public_url no conjunto da aba só depois do PUT 200', async () => {
      fetchMock.mockResolvedValue(
        presignResponse(200, { upload_url: UPLOAD_URL, public_url: PUBLIC_URL }),
      )
      const xhrs = installXHR()

      render(<PostForm onSubmit={mockOnSubmit} isLoading={false} />)
      await chooseCover()

      await waitFor(() => expect(xhrs).toHaveLength(1))
      expect(isSessionImageUrl(PUBLIC_URL)).toBe(false)

      act(() => {
        xhrs[0]!.status = 500
        xhrs[0]!.onload?.()
      })
      expect(isSessionImageUrl(PUBLIC_URL)).toBe(false)
      expect(screen.queryByRole('img', { name: 'Capa do post' })).not.toBeInTheDocument()
      expect(await screen.findByText('Erro ao enviar imagem ao S3')).toBeInTheDocument()

      act(() => {
        xhrs[0]!.status = 200
        xhrs[0]!.onload?.()
      })
      expect(isSessionImageUrl(PUBLIC_URL)).toBe(true)
      expect(screen.getByRole('img', { name: 'Capa do post' })).toHaveAttribute('src', PUBLIC_URL)
    })
  })
})
