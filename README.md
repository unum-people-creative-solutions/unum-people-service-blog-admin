
## 📚 Documentação Oficial (Arquitetura e TDDs)

**Nota Importante:** A documentação técnica detalhada, as regras de IA (Harness), os Technical Design Documents (TDDs) e o log de estado contínuo deste projeto **não ficam armazenados neste repositório**.

Para obter o contexto arquitetural completo e consultar o *Single Source of Truth* do ecossistema, acesse o repositório centralizado de documentação:
👉 **[unum-people-docs](https://github.com/unum-people-creative-solutions/unum-people-docs.git)**

# unum-people-services-blog-admin

Painel de administração (Next.js App Router) para gestão do blog institucional Unum People — CRUD de posts, publicação/despublicação e mídia.

## 1. Funcionalidades
- **Gestão de Posts:** criação, edição, exclusão, publicação/despublicação (`blogApi`, `src/lib/api.ts`), com upload de mídia via URL assinada.
- **Multi-tenant:** seletor de tenant (`TenantSwitcher`), com acesso condicionado ao serviço `blog` contratado pelo tenant (`ServiceGuard` — bloqueia em `/403` quando o tenant não tem o serviço ou não tem nenhum tenant vinculado).
- **Termos de Uso e Políticas Pendentes:** integrado via `PendingTermsGate`, que consulta `GET /me/terms/status` (via `termsApi.getStatus()`, com propagação automática de `X-Tenant-ID` por `fetchWithAuth`). Se houver alguma pendência acionável de termos ou políticas, o usuário é redirecionado para o Portal do Cliente (`customer.unumpeople.com.br`) para aceitação.

## 2. Autenticação (Cognito Hosted UI / SSO)
Não existe mais tela de login/esqueci-senha própria do app — `AuthGuard` redireciona (`window.location.href`, PKCE) para o domínio Hosted UI (`auth.unumpeople.com.br`, App Client dedicado deste app, provisionado em `Infraestrutura/unum-people-services-infra`). Fluxo:
- Sem sessão válida → `redirectToHostedUI` (`src/lib/pkce.ts`) gera `code_verifier`/`code_challenge` (CSPRNG + SHA-256), persiste o verifier em `sessionStorage` (uso único) e monta a URL de `/oauth2/authorize`.
- `src/app/auth/callback/page.tsx` troca `code`+`code_verifier` por tokens, decodifica os mesmos claims do fluxo antigo (`custom:tenant_id`, `cognito:groups`), preserva a sondagem de acesso ao blog (`blogApi.listPosts`, com bypass para `Admins`/`GlobalAdmin`/`TenantAdmin`) e redireciona pra `/posts` (acesso concedido) ou `/403` (sem serviço de blog contratado).
- Logout explícito ("Sair", `403`) usa `logoutFromHostedUI()` (endpoint `/oauth2/logout` do Cognito — encerra a sessão SSO de verdade); reautenticação silenciosa (401 da API, `AuthGuard`/`ServiceGuard` sem sessão) usa `redirectToHostedUI` (reaproveita a sessão SSO ainda válida).
- **Variáveis de ambiente necessárias:** `NEXT_PUBLIC_COGNITO_HOSTED_UI_DOMAIN`, `NEXT_PUBLIC_COGNITO_BLOG_CLIENT_ID` (só existem depois do `terraform apply` do repo de infra gerar o domínio/client ID reais).

## 3. Testes
**Vitest** + **React Testing Library**.
- **Execução:** `npm test`
- **Cobertura crítica:** `AuthGuard`/`ServiceGuard`, `src/lib/pkce.ts`, `auth/callback`.
