import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import TenantSwitcher from './TenantSwitcher';
import { useAuthStore } from '@/store/useAuthStore';

// Mock lucide-react to avoid icon loading/rendering issues in test
vi.mock('lucide-react', () => ({
  Building2: () => <div data-testid="building-icon" />,
  ChevronDown: () => <div data-testid="chevron-icon" />,
  Check: () => <div data-testid="check-icon" />,
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

    // With 1 tenant
    useAuthStore.setState({
      availableTenants: [{ id: 'tenant-1', name: 'Tenant One' }],
    });
    const { container: container1 } = render(<TenantSwitcher onTenantChange={onTenantChangeMock} />);
    expect(container1.firstChild).toBeNull();
  });

  it('renders inline selection when activeTenantId is null and there are multiple tenants', () => {
    useAuthStore.setState({
      availableTenants: [
        { id: 'tenant-1', name: 'Tenant One' },
        { id: 'tenant-2', name: 'Tenant Two' },
      ],
      activeTenantId: null,
      activeTenantName: null,
    });

    render(<TenantSwitcher onTenantChange={onTenantChangeMock} />);

    // Should display inline selection options
    expect(screen.getByText('Selecionar Tenant:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tenant One' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tenant Two' })).toBeInTheDocument();

    // Click on one options
    fireEvent.click(screen.getByRole('button', { name: 'Tenant Two' }));

    expect(useAuthStore.getState().activeTenantId).toBe('tenant-2');
    expect(useAuthStore.getState().activeTenantName).toBe('Tenant Two');
    expect(onTenantChangeMock).toHaveBeenCalled();
  });

  it('renders badge with active tenant name when activeTenantId is set', () => {
    useAuthStore.setState({
      availableTenants: [
        { id: 'tenant-1', name: 'Tenant One' },
        { id: 'tenant-2', name: 'Tenant Two' },
      ],
      activeTenantId: 'tenant-1',
      activeTenantName: 'Tenant One',
    });

    render(<TenantSwitcher onTenantChange={onTenantChangeMock} />);

    expect(screen.getByText('Tenant One')).toBeInTheDocument();
    expect(screen.getByTestId('building-icon')).toBeInTheDocument();
  });

  it('opens dropdown and allows changing active tenant when badge is clicked', () => {
    useAuthStore.setState({
      availableTenants: [
        { id: 'tenant-1', name: 'Tenant One' },
        { id: 'tenant-2', name: 'Tenant Two' },
      ],
      activeTenantId: 'tenant-1',
      activeTenantName: 'Tenant One',
    });

    render(<TenantSwitcher onTenantChange={onTenantChangeMock} />);

    // Click badge to open dropdown
    fireEvent.click(screen.getByText('Tenant One'));

    // Check that dropdown options are visible
    const optionOne = screen.getByRole('menuitem', { name: 'Tenant One' });
    const optionTwo = screen.getByRole('menuitem', { name: 'Tenant Two' });

    expect(optionOne).toBeInTheDocument();
    expect(optionTwo).toBeInTheDocument();

    // Active one should have a checkmark
    expect(screen.getByTestId('check-icon')).toBeInTheDocument();

    // Click optionTwo
    fireEvent.click(optionTwo);

    expect(useAuthStore.getState().activeTenantId).toBe('tenant-2');
    expect(useAuthStore.getState().activeTenantName).toBe('Tenant Two');
    expect(onTenantChangeMock).toHaveBeenCalled();

    // Dropdown should be closed (options not visible anymore)
    expect(screen.queryByRole('menuitem', { name: 'Tenant One' })).not.toBeInTheDocument();
  });
});
