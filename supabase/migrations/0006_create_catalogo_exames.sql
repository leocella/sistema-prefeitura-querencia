-- Catálogo de Exames e Valores Monetários
CREATE TABLE catalogo_exames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  codigo text,
  valor numeric(10,2) DEFAULT 0,
  destaque boolean DEFAULT false,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Inserir os exames padrão solicitados
INSERT INTO catalogo_exames (nome, codigo, valor, destaque) VALUES
('TROPONINA I', '02.02.02.013-4', 43.33, true),
('CPK', '02.02.01.032-5', 40.66, true),
('CK-MB', '02.02.01.033-3', 34.33, true),
('HEMOGRAMA COMPLETO', '02.02.02.038-0', 7.03, false),
('PLAQUETAS', '02.02.02.002-9', 7.16, false),
('UREIA', '02.02.01.069-4', 4.06, false),
('CREATININA', '02.02.01.031-7', 4.16, false),
('SODIO', '02.02.01.063-5', 25.66, false),
('POTASSIO', '02.02.01.060-0', 25.66, false),
('AMILASE', '02.02.01.018-0', 15.66, false),
('LIPASE', '02.02.01.055-4', 35.00, false),
('TGO (AST)', '02.02.01.064-3', 4.06, false),
('TGP (ALT)', '02.02.01.065-1', 4.06, false),
('GAMA GT (GGT)', '02.02.01.046-5', 13.00, false),
('BILIRRUBINA TOTAL E FRACOES', '02.02.01.020-1', 14.08, false),
('FOSFATASE ALCALINA', '02.02.01-042-2', 20.33, false),
('GLICOSE', '02.02.01.047-3', 4.06, false),
('ACIDO URICO', '02.02.01.012-0', 4.06, false),
('BETA HCG QUALITATIVO', '02.02.06.021-7', 19.00, false),
('VDRL (SIFILIS)', '02.02.03.113', 7.44, false),
('TIPAGEM ABO+RH (URGENTE)', '02.02.12.002-3', 5.25, false),
('PARCIAL DE URINA (EAS)', '02.02.05.001-7', 7.16, false),
('PROTEINA C REATIVA (PCR)', '02.02.03.020-2', 14.00, false),
('VHS', '02.02.02.015-0', 6.50, false),
('TAP (TEMPO DE PROTROMBINA)', '02.02.02014-2', 20.66, false),
('KPTT / TTPA', '', 33.33, false),
('DIMERO D', '', 90.00, false),
('PROTEINA/CREATININA URINA', '', 30.00, false),
('LIPIDOGRAMA', '', 21.66, false);

-- Adicionar colunas novas nas tabelas existentes
ALTER TABLE solicitacoes ADD COLUMN horario_coleta text;
ALTER TABLE exames ADD COLUMN valor numeric(10,2) DEFAULT 0;

-- RLS para o catálogo
ALTER TABLE catalogo_exames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Catalogo visivel para usuarios autenticados" ON catalogo_exames
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Catalogo insert para admin" ON catalogo_exames
  FOR INSERT TO authenticated WITH CHECK ((SELECT role FROM usuarios WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Catalogo update para admin" ON catalogo_exames
  FOR UPDATE TO authenticated USING ((SELECT role FROM usuarios WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Catalogo delete para admin" ON catalogo_exames
  FOR DELETE TO authenticated USING ((SELECT role FROM usuarios WHERE id = auth.uid()) = 'admin');
