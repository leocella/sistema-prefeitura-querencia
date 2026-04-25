-- Adicionar políticas de INSERT para solicitações e exames

-- Permitir INSERT de solicitações para usuários autenticados
CREATE POLICY "Solicitacoes INSERT para autenticados" ON solicitacoes
  FOR INSERT TO authenticated WITH CHECK (true);

-- Permitir INSERT de exames para usuários autenticados
CREATE POLICY "Exames INSERT para autenticados" ON exames
  FOR INSERT TO authenticated WITH CHECK (true);

-- Permitir INSERT de pacientes para todos autenticados (não apenas admin/hospital)
CREATE POLICY "Pacientes INSERT para autenticados" ON pacientes
  FOR INSERT TO authenticated WITH CHECK (true);
