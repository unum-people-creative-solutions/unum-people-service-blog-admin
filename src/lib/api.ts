import { useAuthStore } from '@/store/useAuthStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().token;
  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  headers.set('Content-Type', 'application/json');

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  content_md?: string;
  excerpt: string;
  cover_image_url?: string;
  video_url?: string;
  tags?: string[];
  status: 'DRAFT' | 'PUBLISHED';
  author_id: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export const blogApi = {
  listPosts: async (status?: string, limit = 10, lastKey?: string): Promise<{ posts: Post[]; last_key: string }> => {
    let query = `?limit=${limit}`;
    if (status) query += `&status=${status}`;
    if (lastKey) query += `&last_key=${encodeURIComponent(lastKey)}`;
    return fetchWithAuth(`/admin/blog/posts${query}`);
  },

  getPost: async (id: string): Promise<Post> => {
    return fetchWithAuth(`/admin/blog/posts/${id}`);
  },

  createPost: async (post: Partial<Post>): Promise<Post> => {
    return fetchWithAuth('/admin/blog/posts', {
      method: 'POST',
      body: JSON.stringify(post),
    });
  },

  updatePost: async (id: string, post: Partial<Post>): Promise<Post> => {
    return fetchWithAuth(`/admin/blog/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(post),
    });
  },

  deletePost: async (id: string): Promise<{ message: string }> => {
    return fetchWithAuth(`/admin/blog/posts/${id}`, {
      method: 'DELETE',
    });
  },

  publishPost: async (id: string): Promise<{ message: string }> => {
    return fetchWithAuth(`/admin/blog/posts/${id}/publish`, {
      method: 'POST',
    });
  },

  unpublishPost: async (id: string): Promise<{ message: string }> => {
    return fetchWithAuth(`/admin/blog/posts/${id}/unpublish`, {
      method: 'POST',
    });
  },

  getUploadURL: async (filename: string, contentType: string): Promise<{ url: string, public_url: string }> => {
    const data = await fetchWithAuth('/admin/blog/media/upload-url', {
      method: 'POST',
      body: JSON.stringify({ filename, content_type: contentType }),
    });
    return { url: data.upload_url, public_url: data.public_url };
  },
};
