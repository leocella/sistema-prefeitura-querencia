# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sistema de Gestão de Exames Laboratoriais for the Prefeitura de Querência/MT. Manages lab exam queues from UPA/hospital, tracking specimen collection and result release across multiple service provider labs (Adelabor, Vidalabor, Pronto Análise, Prevenção).

## Mandatory Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + shadcn/ui + Tailwind CSS
- **Backend/DB**: Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Deploy**: Vercel

## Commands

Once the project is bootstrapped:

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run lint      # ESLint
```

Supabase CLI:
```bash
supabase start                        # Start local Supabase instance
supabase db push                      # Apply migrations
supabase db reset                     # Reset DB and run seed
```

## Architecture

### Expected Folder Structure

```
/app
  /login
  /dashboard
  /solicitacao/[id]
/components
  StatusButtons.tsx       # 3-state status selector (Solicitado|Coletado|Liberado)
  ClassificacaoBadge.tsx  # Emergency (red) / Internment (blue) badge
  LaudoUpload.tsx         # PDF upload modal → Supabase Storage
  SolicitacaoCard.tsx     # Exam request list item
/lib
  supabase.ts
  calcularIdade.ts        # Runtime age calculation from data_nascimento
/supabase
  migrations/             # Schema SQL
  seed.sql                # 4 providers + sample patients, requests, user
```

### Data Flow

- **Authentication**: Supabase Auth (email/password) → redirect to `/dashboard`
- **Row Level Security**: `laboratorio` role users only see their own `prestador_id` records; `admin` and `hospital` roles see all
- **Realtime**: Supabase Realtime subscription on `solicitacoes` table — dashboard updates live when other users change status, no page reload needed
- **PDF upload**: Stored at `laudos/{solicitacao_id}/laudo.pdf` in Supabase Storage → auto-sets status to `liberado`

### Key Business Rules

1. Four fixed providers — seeded via `supabase/seed.sql`, never created dynamically
2. Status flow is **unidirectional**: `solicitado → coletado → liberado` (only admin can reverse)
3. PDF upload automatically triggers `liberado` status
4. Age is **never stored** — always calculated at runtime from `data_nascimento`
5. Use Server Components and Server Actions where possible — avoid unnecessary API routes

### Status Colors (Tailwind/shadcn)

- `solicitado` → gray/neutral
- `coletado` → amber/yellow
- `liberado` → green
- `emergencia` badge → red
- `internamento` badge → blue

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Design Principles

- Mobile-first (used on tablets/phones in labs)
- Optimistic UI on status changes (update locally, then sync to Supabase)
- Loading states on all async actions
- Toast notifications after status changes and PDF uploads
