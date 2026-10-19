import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'
import PostForm from './PostForm'

// spec: gestao-de-acesso-f4-aplicacao RF-06 — o envio de imagem exige blog.midia.enviar.

describe('PostForm: envio de imagem', () => {
  it('sem a permissão, não oferece o envio de imagem', () => {
    const { container } = render(<PostForm onSubmit={vi.fn()} isLoading={false} />)
    expect(screen.queryByRole('button', { name: /fazer upload de imagem/i })).not.toBeInTheDocument()
    expect(container.querySelector('input[type="file"]')).toBeNull()
    // O vídeo do YouTube continua disponível: não é envio de arquivo.
    expect(screen.getByRole('button', { name: /Vídeo YouTube/i })).toBeInTheDocument()
  })

  it('com a permissão, oferece o envio de imagem', () => {
    const { container } = render(<PostForm onSubmit={vi.fn()} isLoading={false} podeEnviarImagem />)
    expect(screen.getByRole('button', { name: /fazer upload de imagem/i })).toBeInTheDocument()
    expect(container.querySelector('input[type="file"]')).not.toBeNull()
  })
})
