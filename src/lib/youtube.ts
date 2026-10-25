/**
 * Mesmo critério do configurador (`lp-builder/src/lp/blog/youtube.ts`,
 * blog-video D3): o editor só aceita como vídeo o link que a página publicada
 * consegue mostrar. Host fora da lista, protocolo que não é http(s) ou ID que não
 * tem 11 caracteres [A-Za-z0-9_-] viram "sem vídeo".
 */
const ID_VALIDO = /^[A-Za-z0-9_-]{11}$/
const HOSTS_YOUTUBE = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com'])

function idValido(id: string | null | undefined): string | null {
  return id && ID_VALIDO.test(id) ? id : null
}

export function youtubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null
  let endereco: URL
  try {
    endereco = new URL(url)
  } catch {
    return null
  }
  if (endereco.protocol !== 'https:' && endereco.protocol !== 'http:') return null

  const partes = endereco.pathname.split('/').filter(Boolean)
  if (endereco.hostname === 'youtu.be') return idValido(partes[0])
  if (!HOSTS_YOUTUBE.has(endereco.hostname)) return null
  if (partes[0] === 'watch') return idValido(endereco.searchParams.get('v'))
  if (partes[0] === 'embed' || partes[0] === 'shorts') return idValido(partes[1])
  return null
}
