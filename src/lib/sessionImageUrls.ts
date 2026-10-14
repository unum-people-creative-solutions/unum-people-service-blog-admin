/** URLs de imagem cujo PUT nesta aba já terminou. Recarregar o módulo esvazia. */
const urls = new Set<string>()

export const PRAZO_MS = 15000
const INTERVALO_MS = 1000

export function registerSessionImageUrl(url: string): void {
  urls.add(url)
}

export function isSessionImageUrl(url: string | null | undefined): url is string {
  return typeof url === 'string' && url.length > 0 && urls.has(url)
}

export function clearSessionImageUrls(): void {
  urls.clear()
}

/** HEAD a cada 1s até 200. Devolve o cancelamento. Não tem prazo: a prévia local cobre a espera. */
export function watchUntilReady(url: string, onReady: () => void): () => void {
  let cancelado = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const poll = () => {
    if (cancelado) return
    fetch(url, { method: 'HEAD' })
      .then((response) => {
        if (cancelado) return
        if (response.status === 200) {
          onReady()
          return
        }
        timer = setTimeout(poll, INTERVALO_MS)
      })
      .catch(() => {
        if (!cancelado) timer = setTimeout(poll, INTERVALO_MS)
      })
  }

  poll()
  return () => {
    cancelado = true
    if (timer !== undefined) clearTimeout(timer)
  }
}

/**
 * HEAD imediato e depois a cada 1s, em paralelo. 200 em todas encerra na hora.
 * Sem 200 — inclusive rede — resolve uma vez ao fim do prazo.
 */
export function waitForSessionImages(targets: readonly string[]): Promise<void> {
  if (targets.length === 0) return Promise.resolve()

  return new Promise((resolve) => {
    let settled = false
    const pending = new Set(targets)
    const finish = () => {
      if (settled) return
      settled = true
      clearInterval(interval)
      clearTimeout(deadline)
      resolve()
    }

    const poll = () => {
      if (settled) return
      for (const url of pending) {
        fetch(url, { method: 'HEAD' })
          .then((response) => {
            if (settled || response.status !== 200) return
            pending.delete(url)
            if (pending.size === 0) finish()
          })
          .catch(() => {
            // Falha de rede não antecipa nem cancela o prazo.
          })
      }
    }

    // Os timers existem antes da primeira consulta, então finish pode
    // limpá-los mesmo que uma resposta chegue de forma síncrona.
    const interval = setInterval(poll, INTERVALO_MS)
    const deadline = setTimeout(finish, PRAZO_MS)
    poll()
  })
}
