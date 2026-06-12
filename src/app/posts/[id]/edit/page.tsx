'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import PostForm from '@/components/blog/PostForm';
import { blogApi } from '@/lib/api';

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  // Query para buscar dados do post
  const { data: post, isLoading, isError, error } = useQuery({
    queryKey: ['post', id],
    queryFn: () => blogApi.getPost(id),
    enabled: !!id,
  });

  // Mutation para atualizar o post
  const mutation = useMutation({
    mutationFn: (data: any) => blogApi.updatePost(id, data),
    onSuccess: () => {
      router.push('/posts');
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-sm">Carregando dados do post...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-red-400 p-4 space-y-4 text-center">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <div className="space-y-1">
          <p className="font-bold text-lg text-white">Erro ao carregar post</p>
          <p className="text-xs text-slate-500 max-w-xs">{error?.message || 'O post não foi encontrado ou você não tem permissão.'}</p>
        </div>
        <Link
          href="/posts"
          className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-sm font-semibold text-slate-200 rounded-lg transition"
        >
          Voltar aos Posts
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8 relative">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.06),transparent_60%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Breadcrumb / Back Link */}
        <div className="flex items-center gap-3">
          <Link
            href="/posts"
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-2">
            <Link href="/posts" className="hover:text-slate-400">Posts</Link>
            <span>/</span>
            <span className="text-slate-300">Editar Post</span>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Editar Post</h1>
          <p className="text-slate-400 text-sm">Altere os campos que deseja atualizar no post.</p>
        </div>

        {/* Error message */}
        {mutation.isError && (
          <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/40 text-red-400 text-sm">
            Erro ao atualizar post: {mutation.error?.message || 'Erro desconhecido'}
          </div>
        )}

        {/* Form */}
        {post && (
          <PostForm
            initialData={post}
            onSubmit={(data) => mutation.mutate(data)}
            isLoading={mutation.isPending}
          />
        )}
      </div>
    </main>
  );
}
