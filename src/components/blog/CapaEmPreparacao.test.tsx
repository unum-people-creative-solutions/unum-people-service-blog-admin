import { render, screen, fireEvent, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CapaEmPreparacao } from './CapaEmPreparacao'

describe('CapaEmPreparacao', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('volta a mostrar a imagem quando a capa muda', () => {
    const { rerender } = render(<CapaEmPreparacao src="https://cdn.example/a.webp" />)
    fireEvent.error(screen.getByRole('img', { name: 'Capa do post' }))
    expect(screen.getByRole('img', { name: 'A imagem está sendo preparada.' })).toBeInTheDocument()

    rerender(<CapaEmPreparacao src="https://cdn.example/b.webp" />)

    expect(screen.getByRole('img', { name: 'Capa do post' })).toHaveAttribute('src', 'https://cdn.example/b.webp')
  })

  it('com a mesma capa, mantém o aviso de preparação', () => {
    const { rerender } = render(<CapaEmPreparacao src="https://cdn.example/a.webp" />)
    fireEvent.error(screen.getByRole('img', { name: 'Capa do post' }))

    rerender(<CapaEmPreparacao src="https://cdn.example/a.webp" />)

    expect(screen.getByRole('img', { name: 'A imagem está sendo preparada.' })).toBeInTheDocument()
  })

  it('o prazo de falha recomeça quando a capa muda', () => {
    const { rerender } = render(<CapaEmPreparacao src="https://cdn.example/a.webp" />)
    fireEvent.error(screen.getByRole('img', { name: 'Capa do post' }))
    act(() => {
      vi.advanceTimersByTime(100_000)
    })

    rerender(<CapaEmPreparacao src="https://cdn.example/b.webp" />)
    fireEvent.error(screen.getByRole('img', { name: 'Capa do post' }))
    act(() => {
      vi.advanceTimersByTime(30_000)
    })

    // 30 s desde a falha da capa B: ainda dentro do prazo de 120 s.
    expect(screen.getByRole('img', { name: 'A imagem está sendo preparada.' })).toBeInTheDocument()
  })
})
