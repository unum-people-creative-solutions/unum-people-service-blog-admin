import { describe, expect, it, vi, beforeEach } from 'vitest';
import { acessosApi, blogApi, mensagemDeErro, MENSAGEM_SEM_PERMISSAO, type ErroDaApi, type MeusAcessos } from './api';
import { useAuthStore } from '@/store/useAuthStore';

// spec: gestao-de-acesso-f4-aplicacao RF-06 (leitura de /me/acessos e recusa por permissão).

const acessosDoEditor: MeusAcessos = {
  tenant_id: 'tenant-123',
  operador: false,
  ferramentas: [
    { id: 'blog', nome: 'Blog', contratada: true, papel: { id: 'editor', nome: 'Editor', sistema: true, implicito: true }, permissoes: ['blog.post.ver', 'blog.post.publicar'] },
  ],
};

function resposta(status: number, corpo: unknown) {
  return { ok: status < 400, status, json: async () => corpo };
}

describe('acessosApi e recusa por permissão', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
    useAuthStore.setState({ token: 'mock-token', activeTenantId: 'tenant-123' });
  });

  it('acessosApi.get lê /me/acessos da empresa ativa (X-Tenant-ID) e devolve o corpo', async () => {
    mockFetch.mockResolvedValue(resposta(200, acessosDoEditor));
    const resultado: MeusAcessos = await acessosApi.get();
    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toMatch(/\/me\/acessos$/);
    expect((init.headers as Headers).get('X-Tenant-ID')).toBe('tenant-123');
    expect(resultado).toEqual(acessosDoEditor);
  });

  it('o erro da API carrega status e permissao, e a mensagem continua a da API', async () => {
    mockFetch.mockResolvedValue(resposta(403, { error: 'forbidden', permissao: 'blog.post.publicar' }));
    const erro = (await blogApi.publishPost('post-1').catch((e) => e)) as ErroDaApi;
    expect(erro).toBeInstanceOf(Error);
    expect(erro.status).toBe(403);
    expect(erro.permissao).toBe('blog.post.publicar');
    expect(erro.message).toBe('forbidden');
  });

  it('mensagemDeErro usa a mensagem de permissão só no 403 com permissao', async () => {
    mockFetch.mockResolvedValue(resposta(403, { error: 'forbidden', permissao: 'blog.post.excluir' }));
    const recusa = await blogApi.deletePost('post-1').catch((e) => e);
    expect(mensagemDeErro(recusa, 'Não foi possível excluir o post.')).toBe(MENSAGEM_SEM_PERMISSAO);
    expect(MENSAGEM_SEM_PERMISSAO).toBe('Você não tem permissão para fazer isso nesta empresa.');

    mockFetch.mockResolvedValue(resposta(403, { error: 'Tenant access blocked. Contact support.' }));
    const bloqueio = await blogApi.deletePost('post-1').catch((e) => e);
    expect(mensagemDeErro(bloqueio, 'Não foi possível excluir o post.')).toBe('Tenant access blocked. Contact support.');

    expect(mensagemDeErro(new Error(''), 'Não foi possível excluir o post.')).toBe('Não foi possível excluir o post.');
  });
});
