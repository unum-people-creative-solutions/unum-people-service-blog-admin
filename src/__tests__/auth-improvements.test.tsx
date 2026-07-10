import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PostsPage from '../app/posts/page';

// Mocking dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() })
}));
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />
}));
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: null, isLoading: false, isError: false }),
  useMutation: () => ({ mutate: vi.fn() }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  QueryClient: vi.fn(),
  QueryClientProvider: ({ children }: any) => <div>{children}</div>
}));
vi.mock('@/store/useAuthStore', () => ({
  useAuthStore: () => ({
    isAdmin: true,
    activeTenantId: '123',
    availableTenants: [],
    logout: vi.fn()
  })
}));

describe('Authentication Flow & Layout Tests', () => {
  it('Should render the "Sair" button on Posts main screen', () => {
    render(<PostsPage />);
    const logoutBtn = screen.getByRole('button', { name: /sair/i });
    expect(logoutBtn).toBeInTheDocument();
  });
});
