'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Building2 } from 'lucide-react';
import Link from 'next/link';
import PostForm from '@/components/blog/PostForm';
import { blogApi } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

export default function NewPostPage() {
  const router = useRouter();
  const { activeTenantName } = useAuthStore();

  const mutation = useMutation({
    mutationFn: blogApi.createPost,
    onSuccess: () => {
      router.push('/posts');
    },
  });

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
            <span className="text-slate-300">Novo Post</span>
          </div>
        </div>

        {/* Title */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Criar Novo Post</h1>
            <p className="text-slate-400 text-sm">Preencha os campos abaixo para criar um novo post de blog.</p>
          </div>
          {activeTenantName && (
            <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
              <Building2 className="w-5 h-5 text-slate-500" />
              <span className="text-sm font-semibold text-slate-300">
                Blog: <span className="text-accent-400">{activeTenantName}</span>
              </span>
            </div>
          )}
        </div>

        {/* Error message */}
        {mutation.isError && (
          <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/40 text-red-400 text-sm">
            Erro ao criar post: {mutation.error?.message || 'Erro desconhecido'}
          </div>
        )}

        {/* Form */}
        <PostForm
          onSubmit={(data) => mutation.mutate(data)}
          isLoading={mutation.isPending}
        />
      </div>
    </main>
  );
}
