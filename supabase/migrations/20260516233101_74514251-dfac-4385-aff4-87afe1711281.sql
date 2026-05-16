CREATE UNIQUE INDEX IF NOT EXISTS user_roles_unique_elder_position_per_congregation
ON public.user_roles (congregation_id, elder_position)
WHERE role = 'elder'
  AND elder_position IN ('coordenador', 'secretario', 'sup_servico');