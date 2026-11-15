-- Fervor · 25 · Lista dos scripts SQL já executados
-- Serve para você saber, olhando uma tabela, quais scripts numerados já rodaram.
-- Cole no SQL Editor e clique em Run (pode repetir sem problema).
-- Daqui para frente, no fim de cada script novo entra uma linha:
--   select public.marcar_script(26, 'nome_do_script');
-- Para ver a lista: select * from public.scripts_executados order by numero;

create table if not exists public.scripts_executados (
  numero int primary key,
  nome text not null,
  executado_em timestamptz not null default now()
);
alter table public.scripts_executados enable row level security;
drop policy if exists scripts_select on public.scripts_executados;
create policy scripts_select on public.scripts_executados for select to authenticated using (public.is_admin());

create or replace function public.marcar_script(n int, nm text)
returns void language sql security definer set search_path = public as $$
  insert into public.scripts_executados(numero, nome) values (n, nm)
  on conflict (numero) do nothing;
$$;
revoke all on function public.marcar_script(int, text) from public, anon, authenticated;

-- scripts que já foram executados até aqui
select public.marcar_script(n, nm) from (values
  (10,'recado_exemplo'),(11,'acesso_banda'),(12,'auditoria'),(13,'erros'),
  (14,'lembrete_disponibilidade'),(15,'faixas_separadas'),(16,'fotos_de_perfil'),
  (17,'chat_publico'),(18,'chat_membros_fixos'),(19,'chat_so_banda_fixa'),
  (20,'chat_completo'),(21,'chat_jeito_apple'),(22,'chat_limite_upload'),
  (23,'repertorios_iguais_planilha'),(24,'sem_cantor_pos_palavra'),(25,'controle_scripts')
) as t(n, nm);
