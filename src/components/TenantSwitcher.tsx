'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

interface TenantSwitcherProps {
  onTenantChange?: () => void;
}

export default function TenantSwitcher({ onTenantChange }: TenantSwitcherProps) {
  const { availableTenants, activeTenantId, activeTenantName, setActiveTenant } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (availableTenants.length <= 1) {
    return null;
  }

  const handleSelectTenant = (id: string, name: string) => {
    setActiveTenant(id, name);
    setIsOpen(false);
    if (onTenantChange) {
      onTenantChange();
    }
  };

  // If no tenant is selected, show an inline selection
  if (activeTenantId === null) {
    return (
      <div className="flex flex-col gap-2 p-3 bg-slate-900 border border-slate-700 rounded-md">
        <span className="text-xs text-slate-400 font-semibold">Selecionar Tenant:</span>
        <div className="flex flex-wrap gap-2">
          {availableTenants.map((tenant) => (
            <button
              key={tenant.id}
              onClick={() => handleSelectTenant(tenant.id, tenant.name)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-sm transition-colors"
            >
              {tenant.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-200 text-sm font-semibold rounded-lg transition-colors focus:outline-none"
      >
        <Building2 className="w-4 h-4 text-slate-450" />
        <span>{activeTenantName}</span>
        <ChevronDown className="w-4 h-4 text-slate-450 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-slate-850 border border-slate-700 ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {availableTenants.map((tenant) => {
              const isActive = tenant.id === activeTenantId;
              return (
                <button
                  key={tenant.id}
                  onClick={() => handleSelectTenant(tenant.id, tenant.name)}
                  className={`flex items-center justify-between w-full px-4 py-2 text-sm text-left transition-colors ${
                    isActive
                      ? 'text-accent-400 font-bold bg-slate-800'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                  }`}
                  role="menuitem"
                >
                  <span>{tenant.name}</span>
                  {isActive && <Check className="w-4 h-4 text-accent-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
