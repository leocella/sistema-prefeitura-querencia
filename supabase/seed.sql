-- Inserindo Prestadores Fixos
INSERT INTO prestadores (id, nome, ativo) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Adelabor', true),
  ('22222222-2222-2222-2222-222222222222', 'Vidalabor', true),
  ('33333333-3333-3333-3333-333333333333', 'Pronto Análise', true),
  ('44444444-4444-4444-4444-444444444444', 'Prevenção', true)
ON CONFLICT DO NOTHING;

-- Inserindo Pacientes Mockados
INSERT INTO pacientes (id, nome_completo, data_nascimento, cpf) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'João Carlos Santos', '1965-03-12', '111.111.111-11'),
  ('a2222222-2222-2222-2222-222222222222', 'Maria da Silva Mendes', '1982-10-04', '222.222.222-22'),
  ('a3333333-3333-3333-3333-333333333333', 'Roberto de Souza', '2005-07-21', '333.333.333-33')
ON CONFLICT DO NOTHING;

-- Inserindo Solicitações Mockadas
INSERT INTO solicitacoes (id, codigo_barras, paciente_id, prestador_id, medico_solicitante, solicitante_origem, data_prevista, hora_prevista, classificacao, status, qtd_exames, qtd_realizados) VALUES
  ('b1111111-1111-1111-1111-111111111111', '740086-1', 'a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Dr. Alceu', 'UPA', CURRENT_DATE, '08:30:00', 'internamento', 'solicitado', 3, 0),
  ('b2222222-2222-2222-2222-222222222222', '740086-2', 'a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Dra. Luiza', 'UPA', CURRENT_DATE, '09:00:00', 'emergencia', 'coletado', 1, 1),
  ('b3333333-3333-3333-3333-333333333333', '740086-3', 'a3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Dr. Marcos', 'Hospital', CURRENT_DATE, '10:15:00', 'internamento', 'liberado', 2, 2)
ON CONFLICT DO NOTHING;

-- Inserindo Exames referentes as Solicitações
INSERT INTO exames (solicitacao_id, nome_exame, codigo_procedimento, realizado) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'Hemograma Completo', '0202020380', false),
  ('b1111111-1111-1111-1111-111111111111', 'Glicemia', '0202010473', false),
  ('b1111111-1111-1111-1111-111111111111', 'Colesterol Total', '0202010295', false),
  ('b2222222-2222-2222-2222-222222222222', 'PCR', '0202031110', true),
  ('b3333333-3333-3333-3333-333333333333', 'Sódio', '0202010643', true),
  ('b3333333-3333-3333-3333-333333333333', 'Potássio', '0202010600', true)
ON CONFLICT DO NOTHING;

-- (O usuário/roles do Auth serão geridos via Painel Supabase + User Triggers ou pelo dashboard, 
-- mas podemos deixar a query para quando atrelar depois)
