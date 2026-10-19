import { describe, expect, it } from 'vitest';
import { useAuthStore } from './useAuthStore';

// gestao-de-acesso-f5 RF-08 (Verifier das telas, G3): o isAdmin guardado no
// navegador antes da fase 5 (TenantAdmin/Admins) não sobrevive à recarga.
describe('reidratação da sessão', () => {
  it('recalcula isAdmin pelos grupos: só GlobalAdmin', async () => {
    for (const [groups, esperado] of [[['TenantAdmin', 'Admins'], false], [['GlobalAdmin'], true]] as const) {
      localStorage.setItem('blog-admin-auth-storage', JSON.stringify({
        state: { user: { email: 'x@x.com', groups }, token: 't', isAuthenticated: true, isAdmin: true, enabledServices: [] },
        version: 0,
      }));
      await useAuthStore.persist.rehydrate();
      expect(useAuthStore.getState().isAdmin).toBe(esperado);
    }
  });
});
