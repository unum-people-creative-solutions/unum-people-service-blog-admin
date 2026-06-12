'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { 
  Save, 
  Image as ImageIcon, 
  Video, 
  Tag as TagIcon, 
  X, 
  ChevronRight, 
  Bold, 
  Italic, 
  Link2, 
  Heading1, 
  Heading2, 
  Code, 
  Eye, 
  PenTool,
  UploadCloud,
  FileImage,
  AlertCircle
} from 'lucide-react';
import { blogApi, Post } from '@/lib/api';

// Helper local de Slugify
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]/g, '-') // Substitui nao alfanumericos por hifen
    .replace(/-+/g, '-') // Colapsa hifens multiplos
    .replace(/^-+|-+$/g, ''); // Trim hifens do inicio e fim
}

const postSchema = zod.object({
  title: zod.string().min(3, 'O título precisa ter pelo menos 3 caracteres'),
  slug: zod.string().min(3, 'O slug precisa ter pelo menos 3 caracteres'),
  excerpt: zod.string().min(10, 'O resumo precisa ter pelo menos 10 caracteres'),
  content_md: zod.string().min(20, 'O conteúdo precisa ter pelo menos 20 caracteres'),
  cover_image_url: zod.string().optional(),
  video_url: zod.string().url('URL inválida').or(zod.string().length(0)).optional(),
  seo: zod.object({
    meta_title: zod.string().optional(),
    meta_description: zod.string().optional(),
    og_image: zod.string().optional(),
    canonical_url: zod.string().optional(),
  }).optional(),
});

type PostFormData = zod.infer<typeof postSchema>;

interface PostFormProps {
  initialData?: Post;
  onSubmit: (data: Partial<Post>) => void;
  isLoading: boolean;
}

export default function PostForm({ initialData, onSubmit, isLoading }: PostFormProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [mediaType, setMediaType] = useState<'IMAGE' | 'YOUTUBE'>(initialData?.video_url ? 'YOUTUBE' : 'IMAGE');
  
  // States de upload de imagem
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: initialData?.title || '',
      slug: initialData?.slug || '',
      excerpt: initialData?.excerpt || '',
      content_md: initialData?.content_md || '',
      cover_image_url: initialData?.cover_image_url || '',
      video_url: initialData?.video_url || '',
      seo: {
        meta_title: initialData?.published_at ? initialData.title : '', // fallback amigavel
        meta_description: initialData?.excerpt || '',
        og_image: initialData?.cover_image_url || '',
        canonical_url: '',
      }
    }
  });

  const watchTitle = watch('title');
  const watchContent = watch('content_md');
  const watchCoverImage = watch('cover_image_url');

  // Autogeracao de Slug baseada no titulo
  useEffect(() => {
    if (!initialData && watchTitle) {
      setValue('slug', slugify(watchTitle), { shouldValidate: true });
    }
  }, [watchTitle, setValue, initialData]);

  // Tag Input Helpers
  const addTag = () => {
    const cleanTag = slugify(tagInput);
    if (cleanTag && !tags.includes(cleanTag) && tags.length < 20) {
      const newTags = [...tags, cleanTag];
      setTags(newTags);
      setTagInput('');
    }
  };

  const removeTag = (indexToRemove: number) => {
    setTags(tags.filter((_, idx) => idx !== indexToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  // Upload S3 via Presigned URL
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(10);
    setUploadError(null);

    try {
      // 1. Obter URL assinada
      const { url } = await blogApi.getUploadURL(file.name, file.type);
      setUploadProgress(30);

      // 2. Fazer PUT direto no S3 com XMLHttp para acompanhar progresso
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url, true);
      xhr.setRequestHeader('Content-Type', file.type);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 70) + 30;
          setUploadProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          // Extrair a URL limpa do bucket S3 removendo query params da URL assinada
          const cleanUrl = url.split('?')[0];
          setValue('cover_image_url', cleanUrl, { shouldValidate: true });
          setUploading(false);
        } else {
          setUploadError('Erro ao enviar imagem ao S3');
          setUploading(false);
        }
      };

      xhr.onerror = () => {
        setUploadError('Falha de conexao com o S3');
        setUploading(false);
      };

      xhr.send(file);

    } catch (err: any) {
      setUploadError(err.message || 'Falha ao iniciar upload');
      setUploading(false);
    }
  };

  // Markdown Toolbar actions
  const insertMarkdown = (syntaxBefore: string, syntaxAfter = '') => {
    const textarea = document.getElementById('content-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    const replacement = syntaxBefore + selectedText + syntaxAfter;
    const newValue = text.substring(0, start) + replacement + text.substring(end);

    setValue('content_md', newValue, { shouldValidate: true });
    
    // Devolve foco e posiciona cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + syntaxBefore.length, start + syntaxBefore.length + selectedText.length);
    }, 50);
  };

  const handleFormSubmit = (data: PostFormData) => {
    onSubmit({
      ...data,
      tags,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8 relative">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Coluna Central / Form Principal */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
            
            {/* Titulo */}
            <div className="space-y-1">
              <label htmlFor="title-input" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Título do Post</label>
              <input
                id="title-input"
                type="text"
                placeholder="Ex: Como configurar integrações AWS"
                {...register('title')}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-sm text-slate-100 placeholder-slate-600 outline-none transition"
              />
              {errors.title && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {errors.title.message}</p>}
            </div>

            {/* Slug */}
            <div className="space-y-1">
              <label htmlFor="slug-input" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Slug do Post</label>
              <input
                id="slug-input"
                type="text"
                placeholder="como-configurar-integracoes-aws"
                {...register('slug')}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-sm text-slate-100 placeholder-slate-600 outline-none transition"
              />
              {errors.slug && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {errors.slug.message}</p>}
            </div>

            {/* Excerpt */}
            <div className="space-y-1">
              <label htmlFor="excerpt-input" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Resumo (Excerpt)</label>
              <textarea
                id="excerpt-input"
                rows={3}
                placeholder="Um breve resumo do post que sera exibido nos cards da listagem..."
                {...register('excerpt')}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-sm text-slate-100 placeholder-slate-600 outline-none transition resize-none"
              />
              {errors.excerpt && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {errors.excerpt.message}</p>}
            </div>
          </div>

          {/* Editor Markdown / Preview split pane */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/20 overflow-hidden backdrop-blur-md flex flex-col min-h-[450px]">
            {/* Header Editor Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === 'editor' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  Editor
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === 'preview' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Visualizar Preview
                </button>
              </div>

              {/* Toolbar do Markdown */}
              {activeTab === 'editor' && (
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => insertMarkdown('**', '**')} title="Negrito" className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"><Bold className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => insertMarkdown('*', '*')} title="Itálico" className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"><Italic className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => insertMarkdown('# ', '')} title="Título 1" className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"><Heading1 className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => insertMarkdown('## ', '')} title="Título 2" className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"><Heading2 className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => insertMarkdown('[texto](', ')')} title="Inserir Link" className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"><Link2 className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => insertMarkdown('`', '`')} title="Código em bloco" className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"><Code className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>

            {/* Area Principal Editor vs Preview */}
            <div className="flex-1 flex flex-col">
              {activeTab === 'editor' ? (
                <textarea
                  id="content-textarea"
                  placeholder="Digite o conteúdo em Markdown aqui..."
                  {...register('content_md')}
                  className="flex-1 w-full p-4 bg-transparent text-slate-100 placeholder-slate-600 outline-none resize-none font-mono text-sm leading-relaxed min-h-[400px]"
                />
              ) : (
                <div className="flex-1 p-6 prose prose-invert prose-emerald max-w-none overflow-y-auto leading-relaxed text-slate-300 min-h-[400px]">
                  {watchContent ? (
                    <div className="space-y-4">
                      {/* Visualizador Simples de Markdown para o preview */}
                      <div className="whitespace-pre-wrap">{watchContent}</div>
                    </div>
                  ) : (
                    <p className="text-slate-600 text-sm italic">Escreva algo no editor para visualizar o preview.</p>
                  )}
                </div>
              )}
            </div>
          </div>
          {errors.content_md && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {errors.content_md.message}</p>}
        </div>

        {/* Sidebar Lateral / Midias & SEO */}
        <div className="space-y-6">
          
          {/* Uploader de Mídia */}
          <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Mídia Destacada</h3>

            {/* Toggle Tipo Mídia */}
            <div className="flex gap-2 p-1 bg-slate-950 border border-slate-850 rounded-lg">
              <button
                type="button"
                onClick={() => setMediaType('IMAGE')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition ${
                  mediaType === 'IMAGE' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Imagem
              </button>
              <button
                type="button"
                onClick={() => setMediaType('YOUTUBE')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition ${
                  mediaType === 'YOUTUBE' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                Vídeo YouTube
              </button>
            </div>

            {mediaType === 'IMAGE' ? (
              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {watchCoverImage ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-800 bg-slate-950 group">
                    <img
                      src={watchCoverImage}
                      alt="Capa do post"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-white rounded-lg transition"
                      >
                        Alterar
                      </button>
                      <button
                        type="button"
                        onClick={() => setValue('cover_image_url', '')}
                        className="p-1.5 bg-red-950/80 border border-red-800/40 text-red-400 rounded-lg hover:bg-red-950 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-video border border-dashed border-slate-800 bg-slate-950/20 hover:bg-slate-950/50 hover:border-emerald-500/50 rounded-lg flex flex-col items-center justify-center gap-2 transition text-slate-500 hover:text-emerald-400"
                  >
                    <UploadCloud className="w-8 h-8" />
                    <span className="text-xs font-medium">Fazer upload de imagem</span>
                  </button>
                )}

                {uploading && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                      <span>Enviando...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden border border-slate-900">
                      <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}

                {uploadError && <p className="text-[10px] text-red-400 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {uploadError}</p>}
              </div>
            ) : (
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="URL do vídeo (ex: https://youtube.com/...)"
                  {...register('video_url')}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-xs text-slate-100 placeholder-slate-600 outline-none transition"
                />
                {errors.video_url && <p className="text-[10px] text-red-400">{errors.video_url.message}</p>}
              </div>
            )}
          </div>

          {/* Tags Section */}
          <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Tags do Post</h3>

            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  id="tag-input"
                  type="text"
                  placeholder="Adicionar tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-xs text-slate-100 placeholder-slate-600 outline-none transition"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-800 border border-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  Adicionar tag
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2">
                {tags.map((tag, idx) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-950 text-xs font-medium text-slate-300 border border-slate-800">
                    {tag}
                    <button type="button" onClick={() => removeTag(idx)} className="text-slate-500 hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Digite a tag e aperte Enter ou vírgula. Máximo 20 tags.</p>
            </div>
          </div>

          {/* Metadados SEO */}
          <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Configurações SEO</h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Meta Title</label>
                <input
                  type="text"
                  placeholder="Fallback: Título do post"
                  {...register('seo.meta_title')}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-xs text-slate-100 placeholder-slate-600 outline-none transition"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Meta Description</label>
                <textarea
                  rows={3}
                  placeholder="Fallback: Resumo do post"
                  {...register('seo.meta_description')}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-xs text-slate-100 placeholder-slate-600 outline-none transition resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Canonical URL</label>
                <input
                  type="text"
                  placeholder="https://..."
                  {...register('seo.canonical_url')}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-xs text-slate-100 placeholder-slate-600 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 active:opacity-90 disabled:opacity-50 text-white rounded-xl transition text-sm font-bold shadow-lg shadow-emerald-950/20"
            >
              <Save className="w-4 h-4" />
              Salvar Post
            </button>
          </div>

        </div>
      </div>
    </form>
  );
}
