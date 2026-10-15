import { afterEach, describe, expect, it, vi } from 'vitest'
import { waitForSessionImages } from './sessionImageUrls'

describe('waitForSessionImages', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('quando a imagem fica pronta, resolve sem deixar timer pendente', async () => {
    vi.useFakeTimers()
    const fetchFalso = vi.fn().mockResolvedValue({ status: 200 })
    vi.stubGlobal('fetch', fetchFalso)

    const espera = waitForSessionImages(['https://cdn.example/capa.webp'])
    await vi.advanceTimersByTimeAsync(0)
    await espera

    expect(vi.getTimerCount()).toBe(0)
    expect(fetchFalso).toHaveBeenCalledTimes(1)
  })
})
