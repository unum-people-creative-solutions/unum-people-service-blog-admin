# Controle de Estado de Orquestração (TLC 2.0)

## TASKS CONCLUÍDAS
- [x] **[TASK-1] Adicionar Link "Esqueci a Senha" no Login**
  - Implementado em `src/app/login/page.tsx`. Testes OK.
- [x] **[TASK-2] Criar Rota e Fluxo de "Esqueci a Senha"**
  - Schema de validação gerado e aplicado.
  - Tela criada e interligada com `amazon-cognito-identity-js`.
  - Funcionalidade e design envidraçado de acordo com o Blueprint.
- [x] **[TASK-3] Adicionar Botão "Sair"**
  - Inserido no layout principal e interligado ao `useAuthStore.getState().logout()`. Testes OK.

## AUDITORIA
- **Segurança:** O proxy da AWS lida com a redefinição de senha mantendo-se estritamente o encapsulamento no client side sem expor chaves (uso do pool de usuários padrão).
- **Testes (TDD):** Estado garantido em GREEN via `vitest`.
- **Status da Feature:** **DONE**.
