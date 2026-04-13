-- Habilitar o Realtime para a tabela solicitacoes
-- Isso garante que as mudanças de status propaguem automaticamente para o Dashboard

alter publication supabase_realtime add table solicitacoes;
