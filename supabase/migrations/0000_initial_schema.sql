-- Migrations para o Sistema Laboratório Querência

CREATE TABLE prestadores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ativo boolean default true,
  created_at timestamptz default now()
);

CREATE TABLE pacientes (
  id uuid primary key default gen_random_uuid(),
  nome_completo text not null,
  data_nascimento date not null,
  cpf text unique,
  created_at timestamptz default now()
);

CREATE TABLE solicitacoes (
  id uuid primary key default gen_random_uuid(),
  codigo_barras text unique not null,
  paciente_id uuid references pacientes(id) on delete cascade,
  prestador_id uuid references prestadores(id) on delete cascade,
  medico_solicitante text not null,
  solicitante_origem text,
  data_prevista date not null,
  hora_prevista time,
  classificacao text check (classificacao in ('internamento', 'emergencia')),
  status text check (status in ('solicitado', 'coletado', 'liberado')) default 'solicitado',
  qtd_exames integer default 0,
  qtd_realizados integer default 0,
  laudo_url text,
  laudo_uploaded_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE exames (
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid references solicitacoes(id) on delete cascade,
  nome_exame text not null,
  codigo_procedimento text,
  realizado boolean default false,
  created_at timestamptz default now()
);

CREATE TABLE usuarios (
  id uuid references auth.users(id) primary key,
  nome text not null,
  prestador_id uuid references prestadores(id) on delete set null,
  role text check (role in ('admin', 'laboratorio', 'hospital')) default 'laboratorio',
  created_at timestamptz default now()
);

-- ==========================
-- ROW LEVEL SECURITY (RLS)
-- ==========================

ALTER TABLE prestadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE exames ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Prestadores: todos autenticados podem ver
CREATE POLICY "Prestadores visiveis para usuarios autenticados" ON prestadores
  FOR SELECT TO authenticated USING (true);

-- Pacientes: todos autenticados podem ver
CREATE POLICY "Pacientes visiveis para usuarios autenticados" ON pacientes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Pacientes insert para admin ou hospital" ON pacientes
  FOR ALL TO authenticated USING (
    (SELECT role FROM usuarios WHERE id = auth.uid()) IN ('admin', 'hospital')
  );

-- Solicitações: 
-- admin/hospital: veem todas
-- laboratorio: apenas do seu prestador
CREATE POLICY "Solicitacoes SELECT por role configurada" ON solicitacoes
  FOR SELECT TO authenticated USING (
    (SELECT role FROM usuarios WHERE id = auth.uid()) IN ('admin', 'hospital')
    OR
    prestador_id = (SELECT prestador_id FROM usuarios WHERE id = auth.uid())
  );

CREATE POLICY "Solicitacoes UPDATE por role configurada" ON solicitacoes
  FOR UPDATE TO authenticated USING (
    (SELECT role FROM usuarios WHERE id = auth.uid()) IN ('admin', 'hospital')
    OR
    prestador_id = (SELECT prestador_id FROM usuarios WHERE id = auth.uid())
  );

-- Exames: segue lógica das solicitações
CREATE POLICY "Exames SELECT/UPDATE baseados na solicitacao" ON exames
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM solicitacoes 
      WHERE id = exames.solicitacao_id
      AND (
        (SELECT role FROM usuarios WHERE usuarios.id = auth.uid()) IN ('admin', 'hospital')
        OR
        prestador_id = (SELECT prestador_id FROM usuarios WHERE usuarios.id = auth.uid())
      )
    )
  );

-- Usuarios: 
CREATE POLICY "Usuarios podem ver proprios dados ou se for admin" ON usuarios
  FOR SELECT TO authenticated USING (
    id = auth.uid() OR (SELECT role FROM usuarios WHERE id = auth.uid()) = 'admin'
  );


-- Habilitar STORAGE bucket 'laudos'
insert into storage.buckets (id, name, public) 
values ('laudos', 'laudos', true)
on conflict do nothing;

CREATE POLICY "Acesso publico ao laudo lido" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'laudos');

CREATE POLICY "Upload permitido a usuarios logados" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'laudos');
