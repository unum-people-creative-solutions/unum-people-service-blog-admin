import type { Mock } from 'vitest';

// Atalho de tipo para os testes: funções que são vi.fn() por causa de um
// vi.mock, mas que o TypeScript ainda vê com a assinatura real. Dá acesso à
// API de mock sem `any`.
export function comoMock(fn: unknown) {
  return fn as Mock<(...args: never[]) => unknown>;
}
