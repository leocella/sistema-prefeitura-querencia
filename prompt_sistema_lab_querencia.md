# Prompt: Sistema de Gestão de Exames Laboratoriais — Prefeitura de Querência/MT

---

## CONTEXTO DO PROJETO

Você vai construir um sistema web completo de gestão de exames laboratoriais para a Prefeitura de Querência/MT. O sistema gerencia a fila de atendimento de exames solicitados pela UPA/hospital, controlando status de coleta e liberação de resultados por múltiplos laboratórios prestadores de serviço.

O sistema é inspirado no SIGSS (sigsaude.guaira.pr.gov.br) — um sistema de saúde municipal já em uso no PR — e deve replicar a lógica de negócio com uma interface moderna, responsiva e focada em mobile.

---

## STACK OBRIGATÓRIA

- **Frontend**: Next.js 14 (App Router) + TypeScript + shadcn/ui + Tailwind CSS
- **Backend/DB**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Deploy**: Vercel
- **Upload de laudos**: Supabase Storage

---

## MODELO DE DADOS (Supabase)

### Tabela: `prestadores`
```sql
id uuid primary key default gen_random_uuid()
nome text not null  -- ex: "Adelabor", "Vidalabor", "Pronto Análise", "Prevenção"
ativo boolean default true
created_at timestamptz default now()
```

### Tabela: `pacientes`
```sql
id uuid primary key default gen_random_uuid()
nome_completo text not null
data_nascimento date not null
cpf text unique
created_at timestamptz default now()
```
> Campo calculado em runtime: `idade` (calculada a partir de `data_nascimento`)

### Tabela: `solicitacoes`
```sql
id uuid primary key default gen_random_uuid()
codigo_barras text unique not null     -- ex: "740086-1"
paciente_id uuid references pacientes(id)
prestador_id uuid references prestadores(id)
medico_solicitante text not null
solicitante_origem text                -- ex: "UNIDADE PRONTO ATENDIMENTO"
data_prevista date not null
hora_prevista time
classificacao text check (classificacao in ('internamento', 'emergencia'))
status text check (status in ('solicitado', 'coletado', 'liberado')) default 'solicitado'
qtd_exames integer default 0
qtd_realizados integer default 0
laudo_url text                         -- URL do arquivo no Supabase Storage
laudo_uploaded_at timestamptz
created_at timestamptz default now()
updated_at timestamptz default now()
```

### Tabela: `exames`
```sql
id uuid primary key default gen_random_uuid()
solicitacao_id uuid references solicitacoes(id) on delete cascade
nome_exame text not null
codigo_procedimento text
realizado boolean default false
created_at timestamptz default now()
```

### Tabela: `usuarios`
```sql
id uuid references auth.users(id) primary key
nome text not null
prestador_id uuid references prestadores(id)
role text check (role in ('admin', 'laboratorio', 'hospital')) default 'laboratorio'
```

---

## PÁGINAS E FUNCIONALIDADES

### 1. `/login`
- Login simples com e-mail e senha via Supabase Auth
- Após login, redireciona para `/dashboard`

---

### 2. `/dashboard` — Lista de Atendimentos
**Tela principal do sistema.**

Layout:
- Header com: logo/nome do sistema + nome do prestador logado + botão de logout
- Filtro por **prestador de serviço** (dropdown: Adelabor / Vidalabor / Pronto Análise / Prevenção)
- Filtro por **data** (date picker, default = hoje)
- Filtro por **classificação** (dropdown: Todos / Internamento / Emergência)
- Lista de solicitações do dia, ordenadas por hora_prevista

Cada item da lista mostra:
- Código de barras (ex: `740086-1`)
- Nome completo do paciente
- Hora prevista
- Nome do médico solicitante
- Origem (ex: UPA)
- Quantidade de exames (ex: `5 exames`)
- **Badge de classificação**: pílula colorida — `EMERGÊNCIA` (vermelho) ou `INTERNAMENTO` (azul)
- **3 botões de status** (radio-style, clicáveis):
  - 🔵 Solicitado
  - 🟡 Coletado
  - 🟢 Liberado
  - O botão ativo fica destacado/preenchido; os outros ficam como outline
  - Ao clicar, atualiza o status imediatamente via Supabase (optimistic UI)

Ao clicar no item (fora dos botões de status), navega para `/solicitacao/[id]`

---

### 3. `/solicitacao/[id]` — Detalhe da Solicitação

Layout em card único com:

**Dados do paciente:**
- Nome completo
- Data de nascimento + **idade calculada** (ex: `12/03/1965 · 61 anos`)
- CPF (formatado: 000.000.000-00)

**Dados da solicitação:**
- Médico solicitante
- Origem/unidade
- Prestador de serviço
- Data/hora prevista
- **Badge de classificação** (Internamento / Emergência)

**Lista de exames:**
- Tabela com nome do exame e código do procedimento
- Checkbox por exame indicando se foi realizado

**Controle de status** (3 botões grandes, centralizados):
```
[ Solicitado ]  [ Coletado ]  [ Liberado ]
```
- Estado atual destacado
- Ao selecionar "Liberado" → abre um modal/drawer para **upload de laudo em PDF**

**Upload de laudo:**
- Input de arquivo (aceita PDF)
- Upload via Supabase Storage no bucket `laudos/{solicitacao_id}/laudo.pdf`
- Após upload, salva `laudo_url` e `laudo_uploaded_at` na tabela `solicitacoes`
- Status é setado automaticamente como `liberado` ao confirmar o upload
- Se já houver laudo: mostra botão "Visualizar laudo" (abre em nova aba) e "Substituir"

---

### 4. Realtime
- A lista do dashboard deve usar Supabase Realtime para atualizar os status automaticamente quando outro usuário/laboratório altera — sem precisar recarregar a página.

---

## REGRAS DE NEGÓCIO

1. **Quatro prestadores fixos**: Adelabor, Vidalabor, Pronto Análise, Prevenção — cadastrados via seed no Supabase.
2. **Fluxo de status**: `solicitado` → `coletado` → `liberado`. Só avança, nunca volta (a menos que seja admin).
3. **Upload de laudo = liberado**: Ao fazer upload de laudo PDF com sucesso, o status muda automaticamente para `liberado`.
4. **Classificação obrigatória**: Toda solicitação deve ter classificação `internamento` ou `emergência`.
5. **Idade calculada em runtime**: Nunca armazenar idade — calcular sempre a partir de `data_nascimento`.
6. **Filtro por prestador**: Usuários com role `laboratorio` só veem as solicitações do prestador vinculado ao seu perfil. Usuários `admin` e `hospital` veem todos.

---

## SEED INICIAL

Criar arquivo `supabase/seed.sql` com:
- 4 prestadores: Adelabor, Vidalabor, Pronto Análise, Prevenção
- 3 pacientes de exemplo
- 5 solicitações de exemplo (mix de status e classificações)
- 1 usuário admin de exemplo

---

## ESTRUTURA DE PASTAS ESPERADA

```
/app
  /login
  /dashboard
  /solicitacao/[id]
/components
  StatusButtons.tsx       ← os 3 botões de status
  ClassificacaoBadge.tsx  ← badge Internamento/Emergência
  LaudoUpload.tsx         ← modal de upload
  SolicitacaoCard.tsx     ← item da lista
/lib
  supabase.ts
  calcularIdade.ts
/supabase
  migrations/
  seed.sql
```

---

## DESIGN / UX

- Interface responsiva, **mobile-first** (sistema será usado em tablets/celulares no laboratório)
- Usar shadcn/ui como base de componentes
- Cores de status:
  - Solicitado → cinza/neutro
  - Coletado → âmbar/amarelo
  - Liberado → verde
- Badge classificação:
  - Emergência → vermelho
  - Internamento → azul
- Tipografia limpa, sem excesso de informação por linha
- Loading states em toda ação assíncrona
- Toast de confirmação após mudança de status ou upload

---

## ENTREGÁVEIS ESPERADOS DO CLAUDE CODE

1. Migrations SQL do Supabase (schema completo)
2. Seed SQL com dados de exemplo
3. Código Next.js completo (todas as páginas e componentes)
4. `.env.example` com todas as variáveis necessárias
5. `README.md` com instruções de setup local e deploy na Vercel

---

## OBSERVAÇÕES FINAIS

- Não usar n8n nem automações externas — tudo direto via Supabase client
- Não criar rotas de API desnecessárias — usar Server Components e Server Actions do Next.js 14 onde possível
- Supabase Realtime apenas na lista do dashboard (não nas demais páginas)
- O sistema deve ser multi-tenant por prestador, mas single-database (Row Level Security via Supabase RLS)
