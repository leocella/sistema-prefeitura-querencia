-- Inserindo os IDs dos usuários criados no painel de Authentication do Supabase
-- para possuírem o cargo de Administrador no sistema

INSERT INTO usuarios (id, nome, role) VALUES 
  ('2e574e51-d009-439f-a505-dc3ed9db0faa', 'Admin Primário', 'admin'),
  ('80d80b56-ecac-445d-b8da-087d784e3e27', 'Admin Secundário', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin', nome = EXCLUDED.nome;
