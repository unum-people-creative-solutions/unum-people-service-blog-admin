import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

// Religar o repositório na Netlify (renomeação de 26/10) apagou o plugin do Next
// que só existia na tela: o site passou a publicar `.next` como estático e toda
// rota virou 404. O plugin precisa estar no arquivo, que sobrevive à religação.
describe('netlify.toml', () => {
  it('declara o plugin do Next.js para a Netlify servir as rotas', () => {
    const toml = readFileSync(path.resolve(__dirname, '../../netlify.toml'), 'utf-8');
    expect(toml).toMatch(/\[\[plugins\]\]\s+package\s*=\s*"@netlify\/plugin-nextjs"/);
  });
});
