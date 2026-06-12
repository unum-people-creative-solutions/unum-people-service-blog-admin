import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import TenantSwitcher from './TenantSwitcher';
import { useAuthStore } from '@/store/useAuthStore';

vi.mock('lucide-react', () => ({
  Building2: () => <div data-testid="building-icon" />,
}));

describe('TenantSwitcher Component', () => {
  const onTenantChangeMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      availableTenants: [],
      activeTenantId: null,
      activeTenantName: null,
      tenantsLoaded: false,
    });
  });

  it('renders null when availableTenants length <= 1', () => {
    const { container } = render(<TenantSwitcher onTenantChange={onTenantChangeMock} />);
    expect(container.firstChild).toBeNull();

    useAuthStore.setState({
      availableTenants: [{ id: 'tenant-1', name: 'Tenant One' }],
    });
    const { container: container1 } = render(<TenantSwitcher onTenantChange={onTenantChangeMock} />);
    expect(container1.firstChild).toBeNull();
  });

  it('renders all tenant tabs when there are multiple tenants', () => {
    useAuthStore.setState({
      availableTenants: [
        { id: 'tenant-1', name: 'Tenant One' },
        { id: 'tenant-2', name: 'Tenant Two' },
      ],
      activeTenantId: null,
      activeTenantName: null,
    });

    render(<TenantSwitcher onTenantChange={onTenantChangeMock} />);

    expect(screen.getByRole('tablist', { name: 'Selecionar Tenant' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Tenant One/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Tenant Two/ })).toBeInTheDocument();
  });

  it('marks the active tenant tab as aria-selected=true', () => {
    useAuthStore.setState({
      availableTenants: [
        { id: 'tenant-1', name: 'Tenant One' },
        { id: 'tenant-2', name: 'Tenant Two' },
      ],
      activeTenantId: 'tenant-1',
      activeTenantName: 'Tenant One',
    });

    render(<TenantSwitcher onTenantChange={onTenantChangeMock} />);

    expect(screen.getByRole('tab', { name: /Tenant One/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Tenant Two/ })).toHaveAttribute('aria-selected', 'false');
  });

  it('switches tenant when a different tab is clicked', () => {
    useAuthStore.setState({
      availableTenants: [
        { id: 'tenant-1', name: 'Tenant One' },
        { id: 'tenant-2', name: 'Tenant Two' },
      ],
      activeTenantId: 'tenant-1',
      activeTenantName: 'Tenant One',
    });

    render(<TenantSwitcher onTenantChange={onTenantChangeMock} />);

    fireEvent.click(screen.getByRole('tab', { name: /Tenant Two/ }));

    expect(useAuthStore.getState().activeTenantId).toBe('tenant-2');
    expect(useAuthStore.getState().activeTenantName).toBe('Tenant Two');
    expect(onTenantChangeMock).toHaveBeenCalledTimes(1);
  });

  it('does not call onTenantChange when clicking the already active tenant', () => {
    useAuthStore.setState({
      availableTenants: [
        { id: 'tenant-1', name: 'Tenant One' },
        { id: 'tenant-2', name: 'Tenant Two' },
      ],
      activeTenantId: 'tenant-1',
      activeTenantName: 'Tenant One',
    });

    render(<TenantSwitcher onTenantChange={onTenantChangeMock} />);

    fireEvent.click(screen.getByRole('tab', { name: /Tenant One/ }));

    expect(onTenantChangeMock).not.toHaveBeenCalled();
    expect(useAuthStore.getState().activeTenantId).toBe('tenant-1');
  });
});
