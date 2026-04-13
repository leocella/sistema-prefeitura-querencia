# Design: Sistema de Gestão de Exames Laboratoriais — Prefeitura de Querência/MT

**Data:** 2026-04-13
**Status:** Aprovado

---

## Contexto

Sistema web para gerenciar a fila de exames laboratoriais solicitados pela UPA/hospital da Prefeitura de Querência/MT. Controla status de coleta e liberação de resultados por múltiplos laboratórios prestadores de serviço (Adelabor, Vidalabor, Pronto Análise, Prevenção).

---

## Seção 1 — Infraestrutura e Pipeline

### Repositório
- GitHub: `sistema-prefeitura-querencia` (privado)
- Branch principal: `main`
- Cada push na `main` dispara deploy automático na Vercel

### Serviços
- **Vercel**: hosting do Next.js, conectado ao GitHub via integração nativa
- **Supabase**: região South America (São Paulo) — Auth + PostgreSQL + Storage + Realtime
- **Env vars**: configuradas em `.env.local` (local) e no painel da Vercel (produção)

### Variáveis de ambiente necessárias
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Seção 2 — Banco de Dados e Autenticação

### Schema (PostgreSQL / Supabase)

```sql
-- Prestadores de serviço (4 fixos, sem criação dinâmica)
prestadores: id, nome, ativo, created_at

-- Pacientes
pacientes: id, nome_completo, data_nascimento, cpf (unique), created_at
-- idade calculada em runtime, nunca armazenada

-- Solicitações (entidade principal)
solicitacoes: id, codigo_barras (unique), paciente_id, prestador_id,
              medico_solicitante, solicitante_origem, data_prevista, hora_prevista,
              classificacao (internamento|emergencia), status (solicitado|coletado|liberado),
              qtd_exames, qtd_realizados, laudo_url, laudo_uploaded_at,
              created_at, updated_at

-- Exames individuais por solicitação
exames: id, solicitacao_id (cascade delete), nome_exame, codigo_procedimento,
        realizado (boolean), created_at

-- Usuários (espelha auth.users)
usuarios: id (ref auth.users), nome, prestador_id, role (admin|laboratorio|hospital)
```

### Row Level Security
- `laboratorio`: vê apenas `solicitacoes` onde `prestador_id = usuario.prestador_id`
- `admin` e `hospital`: sem restrição de prestador

### Autenticação
- Supabase Auth com e-mail/senha
- Middleware Next.js protege `/dashboard` e `/solicitacao/[id]` — redireciona para `/login` se sem sessão

### Storage
- Bucket: `laudos`
- Path: `laudos/{solicitacao_id}/laudo.pdf`
- Acesso público de leitura para permitir link direto (abrir PDF em nova aba)

### Seed (`supabase/seed.sql`)
- 4 prestadores: Adelabor, Vidalabor, Pronto Análise, Prevenção
- 3 pacientes de exemplo
- 5 solicitações (mix de status e classificações)
- 1 usuário admin de exemplo

---

## Seção 3 — Frontend (Next.js 14 App Router)

### Estrutura de pastas
```
/app
  /login
  /dashboard
  /solicitacao/[id]
/components
  StatusButtons.tsx
  ClassificacaoBadge.tsx
  LaudoUpload.tsx
  SolicitacaoCard.tsx
/lib
  supabase.ts       # clientes browser + server
  calcularIdade.ts  # idade em anos a partir de data_nascimento
/supabase
  migrations/
  seed.sql
```

### Páginas

**`/login`**
- Formulário e-mail/senha
- Server Action para autenticar via Supabase Auth
- Redirect para `/dashboard` após sucesso

**`/dashboard`**
- Lista de solicitações ordenadas por `hora_prevista`
- Filtros: prestador (dropdown), data (date picker, default = hoje), classificação
- Supabase Realtime ativo — atualizações de status em tempo real sem reload
- Cada item: código de barras, paciente, hora, médico, origem, qtd exames, badge classificação, StatusButtons

**`/solicitacao/[id]`**
- Dados do paciente: nome, data nascimento + idade calculada, CPF formatado
- Dados da solicitação: médico, origem, prestador, data/hora, badge classificação
- Tabela de exames com checkbox por exame (realizado)
- StatusButtons grandes centralizados
- Ao selecionar "Liberado" → abre LaudoUpload modal

### Componentes

**`StatusButtons`**
- 3 botões radio-style: Solicitado (cinza) | Coletado (âmbar) | Liberado (verde)
- Optimistic UI: atualiza visual imediatamente, depois sincroniza com Supabase
- Toast de confirmação após atualização

**`ClassificacaoBadge`**
- Emergência → pílula vermelha
- Internamento → pílula azul

**`LaudoUpload`**
- Modal/drawer com input de arquivo (PDF only)
- Upload para `laudos/{solicitacao_id}/laudo.pdf` no Supabase Storage
- Após upload: salva `laudo_url` + `laudo_uploaded_at`, seta status para `liberado`
- Se laudo já existe: botão "Visualizar laudo" (nova aba) + botão "Substituir"
- Loading state durante upload + toast de sucesso/erro

**`SolicitacaoCard`**
- Item da lista no dashboard
- Área clicável (navega para `/solicitacao/[id]`) separada dos StatusButtons

### Design
- Mobile-first (usado em tablets/celulares no laboratório)
- shadcn/ui como base de componentes
- Tailwind CSS
- Loading states em toda ação assíncrona
- Toast notifications (sonner ou shadcn/toast)

---

## Regras de Negócio

1. Quatro prestadores fixos — seed apenas, sem criação dinâmica na UI
2. Fluxo de status unidirecional: `solicitado → coletado → liberado` (apenas admin pode reverter)
3. Upload de laudo PDF seta status `liberado` automaticamente
4. Classificação obrigatória em toda solicitação: `internamento` ou `emergencia`
5. Idade nunca armazenada — sempre calculada em runtime de `data_nascimento`
6. Sem API routes desnecessárias — usar Server Components e Server Actions do Next.js 14
7. Supabase Realtime apenas no dashboard

---

## Fora do Escopo

- Criação/edição de prestadores pela UI
- Relatórios ou exportação de dados
- Notificações por e-mail/SMS
- App mobile nativo
