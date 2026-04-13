-- Correção de Inifinite Recursion do RLS na Tabela Usuarios

DROP POLICY IF EXISTS "Usuarios podem ver proprios dados ou se for admin" ON usuarios;

CREATE POLICY "Usuarios podem ver proprios dados ou se for admin" ON usuarios
  FOR SELECT TO authenticated USING (
    id = auth.uid()
  );
