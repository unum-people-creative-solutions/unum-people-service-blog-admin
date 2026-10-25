import { describe, expect, it } from 'vitest'
import { youtubeVideoId } from './youtube'

// blog-video T07: o editor usa a mesma tabela de casos do configurador (D3).
describe('youtubeVideoId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
    ['https://youtube.com/watch?v=dQw4w9WgXcQ&t=30s'],
    ['https://m.youtube.com/watch?feature=share&v=dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc123'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ'],
    ['https://youtube.com/shorts/dQw4w9WgXcQ'],
    ['http://www.youtube.com/watch?v=dQw4w9WgXcQ'],
  ])('reconhece %s', (url) => {
    expect(youtubeVideoId(url)).toBe('dQw4w9WgXcQ')
  })

  it.each([
    [''],
    [null],
    [undefined],
    ['https://vimeo.com/123456'],
    ['https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ'],
    ['https://evil.test/youtu.be/dQw4w9WgXcQ'],
    ['https://www.youtube.com/watch?v=dQw4w9WgXc'],
    ['https://www.youtube.com/watch?v=dQw4w9WgX"Q'],
    ['javascript:alert(1)'],
    ['não é url'],
    // Verifier: o ID tem de ser exatamente o valor inteiro, e o host exato.
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQx'],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ%3Fautoplay%3D1'],
    ['https://youtu.be/dQw4w9WgXcQ%2Fextra'],
    ['https://youtu.be.evil.test/dQw4w9WgXcQ'],
    ['https://evil.youtu.be/dQw4w9WgXcQ'],
    ['ftp://youtube.com/watch?v=dQw4w9WgXcQ'],
    ['https://youtube.com@evil.test/watch?v=dQw4w9WgXcQ'],
    ['https://www.youtube.com/channel/dQw4w9WgXcQ'],
  ])('rejeita %s', (url) => {
    expect(youtubeVideoId(url)).toBeNull()
  })
})
