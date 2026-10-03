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

/**
 * HEAD imediato e depois a cada 1s, em paralelo. 200 em todas encerra na hora.
 * Sem 200 — inclusive rede — resolve uma vez ao fim do prazo.
 */
export function waitForSessionImages(targets: readonly string[]): Promise<void> {
  if (targets.length === 0) return Promise.resolve()

  return new Promise((resolve) => {
    let settled = false
    const pending = new Set(targets)
    let interval: ReturnType<typeof setInterval> | undefined
    let deadline: ReturnType<typeof setTimeout> | undefined

    const finish = () => {
      if (settled) return
      settled = true
      if (interval !== undefined) clearInterval(interval)
      if (deadline !== undefined) clearTimeout(deadline)
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

    poll()
    interval = setInterval(poll, INTERVALO_MS)
    deadline = setTimeout(finish, PRAZO_MS)
  })
}
