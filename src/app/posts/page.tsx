'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  Search,
  Trash2,
  Edit3,
  Upload,
  EyeOff,
  Tag,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  LogOut,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blogApi, Post } from '@/lib/api';
import TenantSwitcher from '@/components/TenantSwitcher';
import { useAuthStore } from '@/store/useAuthStore';

export default function PostsPage() {
  const queryClient = useQueryClient();
  const { isAdmin, activeTenantId } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'PUBLISHED'>('ALL');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Debounce do campo de busca
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Query para buscar posts
  const { data, isLoading, isError } = useQuery({
    queryKey: ['posts', activeTenantId, statusFilter],
    queryFn: () => {
      const apiStatus = statusFilter === 'ALL' ? undefined : statusFilter;
      return blogApi.listPosts(apiStatus, 50);
    },
    enabled: !!activeTenantId,
  });

  // Mutação para deletar post
  const deleteMutation = useMutation({
    mutationFn: (id: string) => blogApi.deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setDeleteConfirmId(null);
    },
  });

  // Mutação para publicar post
  const publishMutation = useMutation({
    mutationFn: (id: string) => blogApi.publishPost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  // Mutação para despublicar post
  const unpublishMutation = useMutation({
    mutationFn: (id: string) => blogApi.unpublishPost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const posts = data?.posts || [];

  // Filtragem local baseada na busca por titulo
  const filteredPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const togglePublish = (post: Post) => {
    if (post.status === 'PUBLISHED') {
      unpublishMutation.mutate(post.id);
    } else {
      publishMutation.mutate(post.id);
    }
  };

  const newPostAction = (
    <Link
      href="/posts/new"
      className="flex items-center gap-2 px-4 py-2 bg-accent-600 hover:bg-accent-500 active:bg-accent-600 rounded-lg transition text-sm font-semibold text-white shadow-md shadow-accent-950/30"
    >
      <Plus className="w-4 h-4" aria-hidden="true" />
      Novo Post
    </Link>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8 relative">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.06),transparent_60%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <Image
              src="/logo.png"
              alt="Unum People"
              width={120}
              height={32}
              className="object-contain"
            />
            <div className="space-y-0.5">
              <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
                <FileText className="w-6 h-6 text-accent-400" aria-hidden="true" />
                Gestão de Blog
              </h1>
              <p className="text-slate-400 text-sm">
                Crie, gerencie e publique posts para os seus clientes de forma simplificada.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {newPostAction}
            <button
              onClick={() => {
                useAuthStore.getState().logout();
                window.location.href = '/login';
              }}
              aria-label="Sair"
              title="Sair do sistema"
              className="p-2 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-900 text-slate-400 hover:text-red-400 hover:border-slate-700/80 transition"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Tenant Tab Bar + Painel de Conteúdo */}
        <div>
          {/* Abas de Tenant */}
          <TenantSwitcher
            onTenantChange={() => queryClient.invalidateQueries({ queryKey: ['posts'] })}
          />

          {/* Painel conectado às abas */}
          <div className="rounded-b-xl rounded-tr-xl border border-slate-700 bg-slate-900/30 backdrop-blur-md overflow-hidden">

            {/* Filtros e Busca */}
            <div className="px-4 py-3 border-b border-slate-800/80 flex flex-col md:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
                <input
                  type="text"
                  aria-label="Buscar post pelo título"
                  placeholder="Buscar post pelo título…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 rounded-lg text-sm text-slate-100 placeholder-slate-500 outline-none transition"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`flex-1 md:flex-initial px-4 py-2 text-xs font-semibold rounded-lg border transition ${
                    statusFilter === 'ALL'
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-transparent border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setStatusFilter('PUBLISHED')}
                  className={`flex-1 md:flex-initial px-4 py-2 text-xs font-semibold rounded-lg border transition ${
                    statusFilter === 'PUBLISHED'
                      ? 'bg-green-950/50 border-green-800/40 text-green-400'
                      : 'bg-transparent border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  Publicados
                </button>
                <button
                  onClick={() => setStatusFilter('DRAFT')}
                  className={`flex-1 md:flex-initial px-4 py-2 text-xs font-semibold rounded-lg border transition ${
                    statusFilter === 'DRAFT'
                      ? 'bg-amber-950/50 border-amber-800/40 text-amber-400'
                      : 'bg-transparent border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  Rascunhos
                </button>
              </div>
            </div>

            {/* Tabela de Posts */}
            {isLoading ? (
              <div className="p-12 flex flex-col items-center justify-center space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500" />
                <p className="text-slate-400 text-sm">Carregando posts...</p>
              </div>
            ) : isError ? (
              <div className="p-12 text-center text-red-400 flex flex-col items-center justify-center space-y-2">
                <AlertTriangle className="w-10 h-10 text-red-500" />
                <p className="font-semibold">Erro ao carregar posts</p>
                <p className="text-xs text-slate-500">Por favor, verifique sua conexão com o servidor.</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="p-16 text-center text-slate-500 space-y-4 flex flex-col items-center justify-center">
                <FileText className="w-12 h-12 text-slate-700" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="font-medium text-slate-400">Nenhum post encontrado</p>
                  <p className="text-xs max-w-xs leading-relaxed">
                    Você ainda não criou posts ou nenhum post atende aos filtros de pesquisa atuais.
                  </p>
                </div>
                {searchTerm === '' && statusFilter === 'ALL' && (
                  <Link
                    href="/posts/new"
                    className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition text-sm font-medium text-slate-200"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    Criar meu primeiro Post
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" role="table">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold uppercase text-slate-400">
                      <th className="py-4 px-6">Título / Excerpt</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6">Tags</th>
                      <th className="py-4 px-6">Data de Criação</th>
                      <th className="py-4 px-6 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredPosts.map((post) => (
                      <tr key={post.id} className="hover:bg-slate-900/10 transition">
                        <td className="py-4 px-6 max-w-md">
                          <div className="space-y-1">
                            <p className="font-bold text-white text-base hover:text-accent-400 transition">
                              <Link href={`/posts/${post.id}/edit`}>{post.title}</Link>
                            </p>
                            <p className="text-xs text-slate-400 truncate max-w-sm">
                              {post.excerpt || 'Sem resumo disponível.'}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {post.status === 'PUBLISHED' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 border border-green-500/20 text-green-400">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Publicado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
                              <Clock className="w-3.5 h-3.5" />
                              Rascunho
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {post.tags && post.tags.length > 0 ? (
                              post.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-[10px] font-medium text-slate-300 border border-slate-700/50"
                                >
                                  <Tag className="w-2.5 h-2.5 text-slate-400" />
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-600">-</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-400 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {new Date(post.created_at).toLocaleDateString('pt-BR')}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right space-x-2">
                          {isAdmin && (
                            <button
                              onClick={() => togglePublish(post)}
                              aria-label={post.status === 'PUBLISHED' ? 'Mudar para Rascunho' : 'Publicar Post'}
                              title={post.status === 'PUBLISHED' ? 'Mudar para Rascunho' : 'Publicar Post'}
                              className={`p-2 rounded-lg border transition ${
                                post.status === 'PUBLISHED'
                                  ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                                  : 'bg-green-950/20 border-green-800/30 text-green-400 hover:bg-green-950/40'
                              }`}
                            >
                              {post.status === 'PUBLISHED' ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Upload className="w-4 h-4" aria-hidden="true" />}
                            </button>
                          )}
                          <Link
                            href={`/posts/${post.id}/edit`}
                            aria-label="Editar Post"
                            title="Editar Post"
                            className="inline-flex p-2 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-900 text-slate-400 hover:text-accent-400 hover:border-slate-700/80 transition"
                          >
                            <Edit3 className="w-4 h-4" aria-hidden="true" />
                          </Link>
                          {isAdmin && (
                            <button
                              onClick={() => setDeleteConfirmId(post.id)}
                              aria-label="Excluir Post"
                              title="Excluir Post"
                              className="p-2 rounded-lg border border-slate-850 bg-red-950/10 hover:bg-red-950/40 text-red-500/80 hover:text-red-400 border-red-950/30 hover:border-red-900/60 transition"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Deleção */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Excluir Post</h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Você tem certeza que deseja excluir permanentemente este post? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-800 rounded-xl transition text-sm font-medium text-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 active:bg-red-600 rounded-xl transition text-sm font-medium text-white shadow-lg shadow-red-950/20"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
