import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import PostForm from './PostForm'
import type { Post } from '@/lib/api'
import { useAuthStore } from '@/store/useAuthStore'

// blog-video T07 / CA-08, CA-09: a mídia destacada é a foto OU o vídeo.
const onSubmit = vi.fn()

function post(sobrescreve: Partial<Post> = {}): Post {
  return {
    id: 'post-1',
    title: 'Título do post',
    slug: 'titulo-do-post',
    excerpt: 'Um resumo com mais de dez caracteres.',
    content_md: 'Conteúdo do post com mais de vinte caracteres.',
    cover_image_url: 'https://cdn.example/optimized/capa.webp',
    video_url: 'https://youtu.be/dQw4w9WgXcQ',
    status: 'DRAFT',
    tags: [],
    author_id: 'autor-1',
    created_at: '2026-10-25T12:00:00Z',
    updated_at: '2026-10-25T12:00:00Z',
    ...sobrescreve,
  }
}

function salvar() {
  fireEvent.click(screen.getByRole('button', { name: /salvar post/i }))
}

describe('PostForm — mídia destacada exclusiva', () => {
  beforeEach(() => {
    onSubmit.mockReset()
    useAuthStore.setState({ isAdmin: true })
  })

  it('CA-08: com Imagem escolhida, o envio tira o vídeo e mantém a capa', async () => {
    render(<PostForm onSubmit={onSubmit} isLoading={false} podeEnviarImagem initialData={post()} />)
    fireEvent.click(screen.getByRole('button', { name: /^imagem$/i }))
    salvar()

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      video_url: '',
      cover_image_url: 'https://cdn.example/optimized/capa.webp',
    })
  })

  it('CA-08: com Vídeo YouTube escolhido, o envio tira a capa e mantém o vídeo', async () => {
    render(<PostForm onSubmit={onSubmit} isLoading={false} podeEnviarImagem initialData={post()} />)
    salvar()

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      cover_image_url: '',
      video_url: 'https://youtu.be/dQw4w9WgXcQ',
    })
  })

  it('CA-09: link que não é do YouTube bloqueia o envio com a mensagem', async () => {
    render(<PostForm onSubmit={onSubmit} isLoading={false} podeEnviarImagem initialData={post({ cover_image_url: '' })} />)
    fireEvent.change(screen.getByPlaceholderText(/url do vídeo/i), { target: { value: 'https://vimeo.com/123456' } })
    salvar()

    expect(await screen.findByText('Use um link do YouTube (youtube.com ou youtu.be).')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByPlaceholderText(/url do vídeo/i)).toHaveFocus()
  })

  it('CA-09: link youtu.be válido passa', async () => {
    render(<PostForm onSubmit={onSubmit} isLoading={false} podeEnviarImagem initialData={post({ cover_image_url: '' })} />)
    fireEvent.change(screen.getByPlaceholderText(/url do vídeo/i), { target: { value: 'https://youtu.be/aaaaaaaaaaa?si=x' } })
    salvar()

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ video_url: 'https://youtu.be/aaaaaaaaaaa?si=x' })
  })

  it('CA-09: com Vídeo YouTube e campo vazio, salva sem vídeo e sem capa', async () => {
    render(<PostForm onSubmit={onSubmit} isLoading={false} podeEnviarImagem initialData={post({ cover_image_url: '' })} />)
    fireEvent.change(screen.getByPlaceholderText(/url do vídeo/i), { target: { value: '' } })
    salvar()

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ video_url: '', cover_image_url: '' })
  })

  // Verifier: os outros caminhos de envio passam pela mesma regra.
  it('CA-08: Salvar e Publicar com Vídeo também tira a capa', async () => {
    render(<PostForm onSubmit={onSubmit} isLoading={false} podeEnviarImagem podePublicar initialData={post()} />)
    fireEvent.click(screen.getByRole('button', { name: /salvar e publicar/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      status: 'PUBLISHED',
      cover_image_url: '',
      video_url: 'https://youtu.be/dQw4w9WgXcQ',
    })
  })

  it('CA-08: post novo com Vídeo YouTube manda o vídeo e a capa vazia', async () => {
    render(<PostForm onSubmit={onSubmit} isLoading={false} podeEnviarImagem />)
    fireEvent.change(screen.getByLabelText(/título do post/i), { target: { value: 'Post novo com vídeo' } })
    fireEvent.change(screen.getByLabelText(/resumo \(excerpt\)/i), { target: { value: 'Um resumo com mais de dez caracteres.' } })
    fireEvent.change(screen.getByPlaceholderText(/digite o conteúdo em markdown/i), {
      target: { value: 'Conteúdo do post com mais de vinte caracteres.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /vídeo youtube/i }))
    fireEvent.change(screen.getByPlaceholderText(/url do vídeo/i), { target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } })
    salvar()

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      cover_image_url: '',
      video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    })
  })

  it('CA-09: com Imagem escolhida, um vídeo inválido antigo não bloqueia; o envio tira o vídeo', async () => {
    render(
      <PostForm
        onSubmit={onSubmit}
        isLoading={false}
        podeEnviarImagem
        initialData={post({ video_url: 'https://vimeo.com/123456' })}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /^imagem$/i }))
    salvar()

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ video_url: '', cover_image_url: 'https://cdn.example/optimized/capa.webp' })
  })
})
