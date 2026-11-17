-- 27_login_obrigatorio.sql · Fervor só abre com e-mail e senha (login obrigatório, sem volta)
-- Rode UMA vez no Supabase: SQL Editor > New query > cole tudo > Run. Pode repetir sem problema.
--
-- O que muda:
--  * Visitante sem login não lê NADA: escala, repertórios, músicas, chat, lista de integrantes.
--  * O login deixa de ser um interruptor: fica sempre ligado e ninguém consegue desligar.
--  * O que continua aberto de propósito: a tela de login (nome e WhatsApp de quem dá a senha),
--    o registro de erros do aplicativo, o cadastro de avisos no celular e o link de aprovação do repertório
--    (que só abre com o código secreto de cada repertório).
--
-- TRAVA DE SEGURANÇA: se algum integrante ATIVO ainda não tem acesso criado, o script PARA e diz quem é.
-- Resolva em Fervor > Ajustes > Acessos (Criar acesso) ou desative quem não toca mais, e rode de novo.

do $$
declare faltam text;
begin
  select string_agg(nome, ', ' order by nome) into faltam from public.membros where ativo and user_id is null;
  if faltam is not null then
    raise exception 'Ainda sem acesso criado: %. Crie o acesso (ou desative a pessoa) e rode de novo.', faltam;
  end if;
end $$;

-- 1) Login sempre ligado (servidor)
insert into public.config (chave, valor) values ('login_banda', 'true'::jsonb)
on conflict (chave) do update set valor = 'true'::jsonb, atualizado_em = now();

create or replace function public.login_banda()
returns boolean language sql stable security definer set search_path = public as $$ select true $$;

create or replace function public.config_travar_login()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.chave = 'login_banda' then raise exception 'O login é obrigatório e não pode ser desligado.'; end if;
    return old;
  end if;
  if new.chave = 'login_banda' and new.valor is distinct from 'true'::jsonb then
    raise exception 'O login é obrigatório e não pode ser desligado.';
  end if;
  return new;
end $$;
drop trigger if exists config_travar_login on public.config;
create trigger config_travar_login before insert or update or delete on public.config
  for each row execute function public.config_travar_login();

-- 2) Chat: nada para quem não está logado
create or replace function public.chat_ativo()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select valor = 'true'::jsonb from public.config where chave = 'chat_ativo'), true)
     and auth.uid() is not null;
$$;
drop policy if exists chat_select_anon on public.chat_mensagens;
drop policy if exists chat_insert_anon on public.chat_mensagens;

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as f
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('chat_ativo','chat_pode','chat_membros','chat_reagir','chat_votar','chat_li','chat_denunciar',
                         'chat_extras','chat_aviso_salvar','chat_apagar','chat_editar','chat_li_ocultar','chat_aviso_pref')
  loop
    execute format('revoke execute on function %s from public, anon', r.f);
    execute format('grant execute on function %s to authenticated', r.f);
  end loop;
end $$;

-- áudios do chat: só quem está logado envia
drop policy if exists "fervor chat audio enviar" on storage.objects;
create policy "fervor chat audio enviar" on storage.objects for insert to authenticated
  with check (bucket_id = 'chat' and public.chat_ativo());

-- 3) Faixas separadas: visitante não consegue nem listar os arquivos
drop policy if exists "b6 faixas ler" on storage.objects;
create policy "b6 faixas ler" on storage.objects for select to authenticated
  using (bucket_id = 'faixas-separadas' and public.is_membro());

-- 4) Tabelas auxiliares sempre fechadas
do $$ begin
  if to_regclass('public.scripts_executados') is not null then
    execute 'alter table public.scripts_executados enable row level security';
    execute 'revoke all on public.scripts_executados from anon, authenticated';
  end if;
end $$;

notify pgrst, 'reload schema';

do $m$ begin if to_regproc('public.marcar_script(integer,text)') is not null then perform public.marcar_script(27, 'login_obrigatorio'); end if; end $m$;

-- 5) Conferência: o que um visitante SEM login ainda consegue usar. Mande um print desta tabela.
select 'função liberada' as tipo, p.proname::text as nome, ''::text as detalhe
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
   and p.prokind = 'f' and p.proname not like 'pg\_%'
union all
select 'regra de leitura/escrita', tablename::text, policyname::text || ' (' || cmd || ')'
  from pg_policies
 where ('anon' = any(roles) or 'public' = any(roles))
   and schemaname in ('public', 'storage')
order by 1, 2;
