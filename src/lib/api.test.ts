import { describe, expect, it, vi, beforeEach } from 'vitest';
import { blogApi } from './api';
import { useAuthStore } from '@/store/useAuthStore';

describe('api.ts - Tenant Headers and listTenants', () => {
  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({}),
  });

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockClear();

    // Reset AuthStore state
    useAuthStore.setState({
      token: 'mock-token',
      activeTenantId: null,
    });
  });

  it('should not include X-Tenant-ID header when activeTenantId is null', async () => {
    await blogApi.listPosts();

    expect(mockFetch).toHaveBeenCalled();
    const fetchArgs = mockFetch.mock.calls[0];
    const headers = fetchArgs[1].headers as Headers;
    
    expect(headers.get('Authorization')).toBe('Bearer mock-token');
    expect(headers.get('X-Tenant-ID')).toBeNull();
  });

  it('should include X-Tenant-ID header when activeTenantId is set', async () => {
    useAuthStore.setState({ activeTenantId: 'tenant-123' });

    await blogApi.listPosts();

    expect(mockFetch).toHaveBeenCalled();
    const fetchArgs = mockFetch.mock.calls[0];
    const headers = fetchArgs[1].headers as Headers;
    
    expect(headers.get('Authorization')).toBe('Bearer mock-token');
    expect(headers.get('X-Tenant-ID')).toBe('tenant-123');
  });

  it('should call GET /me/tenants?service=blog for listTenants', async () => {
    await blogApi.listTenants('blog');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/me/tenants?service=blog'),
      expect.any(Object)
    );
  });

  // blog-video (Verifier): o "" do editor chega ao corpo do PUT, que a API lê
  // como "tirar a capa / o vídeo".
  it('updatePost manda video_url e cover_image_url vazios no corpo do PUT', async () => {
    await blogApi.updatePost('post-1', { title: 'T', video_url: '', cover_image_url: '' });

    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toMatch(/\/admin\/blog\/posts\/post-1$/);
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ title: 'T', video_url: '', cover_image_url: '' });
  });
});
