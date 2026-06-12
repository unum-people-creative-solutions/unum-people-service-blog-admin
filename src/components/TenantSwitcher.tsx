'use client';
import React from 'react';
import { Building2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

interface TenantSwitcherProps {
  onTenantChange?: () => void;
}

export default function TenantSwitcher({ onTenantChange }: TenantSwitcherProps) {
  const { availableTenants, activeTenantId, setActiveTenant } = useAuthStore();

  if (availableTenants.length <= 1) {
    return null;
  }

  const handleSelectTenant = (id: string, name: string) => {
    if (id === activeTenantId) return;
    setActiveTenant(id, name);
    onTenantChange?.();
  };

  return (
    <div
      role="tablist"
      aria-label="Selecionar Tenant"
      className="flex items-end gap-1 overflow-x-auto scrollbar-hide"
    >
      {availableTenants.map((tenant) => {
        const isActive = tenant.id === activeTenantId;

        return (
          <button
            key={tenant.id}
            onClick={() => handleSelectTenant(tenant.id, tenant.name)}
            role="tab"
            aria-selected={isActive}
            className={`group flex items-center gap-3 px-5 rounded-t-xl border-t border-x pb-3 pt-2.5 cursor-pointer transition-all duration-200 ${
              isActive
                ? 'border-slate-700 bg-slate-900 text-white pb-4 pt-3 -mb-px z-10'
                : 'border-slate-800/60 bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Building2
              className={`w-4 h-4 shrink-0 transition-colors ${
                isActive ? 'text-accent-400' : 'text-slate-600 group-hover:text-slate-400'
              }`}
              aria-hidden="true"
            />
            <span className="text-sm font-semibold whitespace-nowrap">{tenant.name}</span>
          </button>
        );
      })}
    </div>
  );
}
