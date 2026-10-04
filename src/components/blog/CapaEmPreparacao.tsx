'use client'

import { useEffect, useState } from 'react'

export const INTERVALO_TENTATIVA_MS = 3000
export const PRAZO_FALHA_MS = 120_000

type Estado = 'foto' | 'processando' | 'falhou'

/**
 * Capa cuja URL já é a da CDN. Enquanto o WebP não existe, o GET falha
 * e o quadro avisa. Quem acabou de enviar o arquivo não usa isto: a prévia
 * fica no blob até o HEAD 200.
 */
export function CapaEmPreparacao({ src, className }: { src: string; className?: string }) {
  const [estado, setEstado] = useState<Estado>('foto')
  const [inicio, setInicio] = useState<number | null>(null)

  useEffect(() => {
    setEstado('foto')
    setInicio(null)
  }, [src])

  useEffect(() => {
    if (estado !== 'processando' || inicio === null) return
    const id = setInterval(() => {
      if (Date.now() - inicio >= PRAZO_FALHA_MS) {
        setEstado('falhou')
        return
      }
      const probe = new window.Image()
      probe.onload = () => setEstado('foto')
      probe.onerror = () => {}
      probe.src = src
    }, INTERVALO_TENTATIVA_MS)
    return () => clearInterval(id)
  }, [estado, inicio, src])

  if (estado !== 'foto') {
    const texto =
      estado === 'processando'
        ? 'A imagem está sendo preparada.'
        : 'A imagem não ficou pronta.'
    return (
      <span role="img" aria-label={texto} className={className}>
        {texto}
      </span>
    )
  }

  return (
    <img
      src={src}
      alt="Capa do post"
      className={className}
      onError={() => {
        setInicio((atual) => atual ?? Date.now())
        setEstado('processando')
      }}
    />
  )
}
