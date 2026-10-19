'use client';

import { useQuery } from '@tanstack/react-query';
import { jwtDecode } from 'jwt-decode';
import { acessosApi } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

export type PermissaoDoBlog =
  | 'blog.post.ver'
  | 'blog.post.criar'
  | 'blog.post.editar_proprio'
  | 'blog.post.editar_qualquer'
  | 'blog.post.publicar'
  | 'blog.post.excluir'
  | 'blog.midia.enviar';

function subDoToken(token: string | null): string | undefined {
  if (!token) return undefined;
  try {
    const { sub } = jwtDecode<{ sub?: string }>(token);
    return sub || undefined;
  } catch {
    // Token ausente na prática ou JWT inválido: sem dono para comparar.
    return undefined;
  }
}

export function useAcessosDoBlog(): {
  carregando: boolean;
  erro: boolean;
  pode: (p: PermissaoDoBlog) => boolean;
  podeEditarPost: (post: { author_id: string }) => boolean;
} {
  const { isAuthenticated, activeTenantId, token } = useAuthStore();

  const query = useQuery({
    queryKey: ['acessos', activeTenantId],
    queryFn: () => acessosApi.get(),
    enabled: isAuthenticated && !!activeTenantId,
  });

  const erro = query.isError ?? false;
  const carregando = !activeTenantId || (query.data == null && !erro);

  const pode = (p: PermissaoDoBlog): boolean => {
    if (carregando || erro) return false;
    return query.data?.ferramentas.find((f) => f.id === 'blog')?.permissoes.includes(p) ?? false;
  };

  const podeEditarPost = (post: { author_id: string }): boolean => {
    const sub = subDoToken(token);
    return pode('blog.post.editar_qualquer') || (pode('blog.post.editar_proprio') && post.author_id === sub);
  };

  return { carregando, erro, pode, podeEditarPost };
}
