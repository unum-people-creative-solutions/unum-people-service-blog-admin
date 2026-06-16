'use client';
import React, { useRef, useState, useEffect } from 'react';
import { Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

interface TenantSwitcherProps {
  onTenantChange?: () => void;
}

export default function TenantSwitcher({ onTenantChange }: TenantSwitcherProps) {
  const { availableTenants, activeTenantId, setActiveTenant } = useAuthStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftScroll(scrollLeft > 0);
      setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [availableTenants]);

  useEffect(() => {
    if (activeTabRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const activeTab = activeTabRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const tabRect = activeTab.getBoundingClientRect();

      if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
        const scrollPosition = activeTab.offsetLeft - (container.clientWidth / 2) + (activeTab.clientWidth / 2);
        container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
      }
    }
  }, [activeTenantId, availableTenants]);

  if (availableTenants.length <= 1) {
    return null;
  }

  const handleSelectTenant = (id: string, name: string) => {
    if (id === activeTenantId) return;
    setActiveTenant(id, name);
    onTenantChange?.();
  };

  const scrollByOffset = (offset: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative flex items-center w-full max-w-full">
      {showLeftScroll && (
        <button
          onClick={() => scrollByOffset(-200)}
          className="absolute left-0 z-20 flex items-center justify-center w-8 h-10 bg-gradient-to-r from-slate-950 via-slate-950 to-transparent text-slate-400 hover:text-white"
          aria-label="Rolar para a esquerda"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        role="tablist"
        aria-label="Selecionar Tenant"
        className="flex items-end gap-1 overflow-x-auto scrollbar-hide w-full px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {availableTenants.map((tenant) => {
          const isActive = tenant.id === activeTenantId;

          return (
            <button
              key={tenant.id}
              ref={isActive ? activeTabRef : null}
              onClick={() => handleSelectTenant(tenant.id, tenant.name)}
              role="tab"
              aria-selected={isActive}
              className={`group flex items-center gap-3 px-5 rounded-t-xl border-t border-x pb-3 pt-2.5 cursor-pointer transition-all duration-200 shrink-0 ${
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

      {showRightScroll && (
        <button
          onClick={() => scrollByOffset(200)}
          className="absolute right-0 z-20 flex items-center justify-center w-8 h-10 bg-gradient-to-l from-slate-950 via-slate-950 to-transparent text-slate-400 hover:text-white"
          aria-label="Rolar para a direita"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
