-- Tabela de médicos
CREATE TABLE medicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  crm text UNIQUE NOT NULL,
  especialidade text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE medicos ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ver médicos ativos
CREATE POLICY "Medicos SELECT para autenticados" ON medicos
  FOR SELECT TO authenticated USING (true);

-- Apenas admin pode inserir/atualizar/deletar
CREATE POLICY "Medicos INSERT para admin" ON medicos
  FOR INSERT TO authenticated WITH CHECK (
    (SELECT role FROM usuarios WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Medicos UPDATE para admin" ON medicos
  FOR UPDATE TO authenticated USING (
    (SELECT role FROM usuarios WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Medicos DELETE para admin" ON medicos
  FOR DELETE TO authenticated USING (
    (SELECT role FROM usuarios WHERE id = auth.uid()) = 'admin'
  );
