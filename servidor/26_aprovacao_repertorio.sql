-- 26_aprovacao_repertorio.sql · Aprovação do repertório pela liderança do ministério (link) + histórico
-- Rode uma vez no Supabase: SQL Editor > New query > cole tudo > Run. Pode repetir sem problema.
-- Como funciona:
--  * A liderança da banda envia o repertório no Fervor e recebe um LINK (sem login) para a liderança do ministério.
--  * Na página do link a liderança do ministério só toca em "Aprovar" ou "Sugerir alteração".
--  * Tudo fica guardado em apv_eventos (enviado, visto, aprovado, ajuste, lembrete...), com dia da semana e hora.
--  * Ninguém lê ou grava nas tabelas direto: só pelas funções abaixo.

create table if not exists public.apv_aprovacoes (
  list_id    text primary key,                 -- id do repertório no Fervor (l_...)
  token      text not null unique default replace(gen_random_uuid()::text, '-', ''),
  versao     int  not null default 1,          -- sobe a cada reenvio
  status     text not null default 'aguardando' check (status in ('aguardando','aprovado','ajuste','rascunho')),
  snapshot   jsonb not null default '{}'::jsonb,   -- o que a liderança do ministério vê
  criado_em  timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.apv_eventos (
  id        bigserial primary key,
  list_id   text not null,
  token     text not null,
  versao    int  not null default 1,
  evento    text not null check (evento in ('enviado','reenviado','visto','aprovado','ajuste','lembrete','manual_aprovado','manual_ajuste','desfeito')),
  por       text,                              -- quem fez (nome)
  nota      text,                              -- pedido de ajuste / observação
  itens     jsonb,                             -- músicas marcadas para trocar
  snapshot  jsonb,                             -- cópia do repertório no momento do envio
  criado_em timestamptz not null default now(),
  dow       int,                               -- 0=domingo ... 6=sábado (horário de Brasília)
  hora      int                                -- 0..23 (horário de Brasília)
);
create index if not exists apv_eventos_list_idx on public.apv_eventos (list_id, criado_em);
create index if not exists apv_eventos_token_idx on public.apv_eventos (token, criado_em);

create or replace function public.apv_carimbo()
returns trigger language plpgsql as $$
declare t timestamp;
begin
  new.criado_em := coalesce(new.criado_em, now());
  t := new.criado_em at time zone 'America/Sao_Paulo';
  new.dow  := extract(dow from t)::int;
  new.hora := extract(hour from t)::int;
  return new;
end $$;
drop trigger if exists apv_eventos_carimbo on public.apv_eventos;
create trigger apv_eventos_carimbo before insert on public.apv_eventos for each row execute function public.apv_carimbo();

-- Nada de acesso direto às tabelas (RLS ligado e sem políticas).
alter table public.apv_aprovacoes enable row level security;
alter table public.apv_eventos    enable row level security;
revoke all on public.apv_aprovacoes from anon, authenticated;
revoke all on public.apv_eventos    from anon, authenticated;

-- 1) Liderança da banda envia (ou reenvia) o repertório. Devolve o token do link.
create or replace function public.apv_enviar(p_list_id text, p_snapshot jsonb, p_por text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.apv_aprovacoes; v int;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Só a liderança da banda envia.'; end if;
  if coalesce(p_list_id,'') = '' then raise exception 'Repertório inválido.'; end if;
  insert into public.apv_aprovacoes (list_id, snapshot, status) values (p_list_id, coalesce(p_snapshot,'{}'::jsonb), 'aguardando')
  on conflict (list_id) do update
    set versao = public.apv_aprovacoes.versao + 1, snapshot = coalesce(p_snapshot,'{}'::jsonb),
        status = 'aguardando', atualizado_em = now()
  returning * into a;
  insert into public.apv_eventos (list_id, token, versao, evento, por, nota, snapshot)
  values (a.list_id, a.token, a.versao, case when a.versao = 1 then 'enviado' else 'reenviado' end,
          left(coalesce(p_por,''),60), left(coalesce(p_snapshot->>'mudancas',''),600), coalesce(p_snapshot,'{}'::jsonb));
  return jsonb_build_object('token', a.token, 'versao', a.versao);
end $$;

-- 2) Liderança da banda registra algo à mão (lembrete enviado, aprovação recebida pelo WhatsApp, desfazer).
create or replace function public.apv_registrar(p_list_id text, p_evento text, p_por text, p_nota text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.apv_aprovacoes;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Só a liderança da banda registra.'; end if;
  if p_evento not in ('lembrete','manual_aprovado','manual_ajuste','desfeito') then raise exception 'Evento inválido.'; end if;
  insert into public.apv_aprovacoes (list_id, status) values (p_list_id, 'rascunho') on conflict (list_id) do nothing;
  select * into a from public.apv_aprovacoes where list_id = p_list_id;
  insert into public.apv_eventos (list_id, token, versao, evento, por, nota)
  values (a.list_id, a.token, a.versao, p_evento, left(coalesce(p_por,''),60), left(coalesce(p_nota,''),1000));
  update public.apv_aprovacoes set atualizado_em = now(),
    status = case p_evento when 'manual_aprovado' then 'aprovado' when 'manual_ajuste' then 'ajuste' when 'desfeito' then 'aguardando' else status end
  where list_id = a.list_id;
  return jsonb_build_object('ok', true);
end $$;

-- 3) Liderança da banda lê tudo (para o painel, os padrões e atualizar o status dos repertórios).
create or replace function public.apv_dados()
returns jsonb language plpgsql security definer stable set search_path = public as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Só a liderança da banda.'; end if;
  return jsonb_build_object(
    'aprov', coalesce((select jsonb_agg(jsonb_build_object('list_id',list_id,'token',token,'versao',versao,'status',status,'atualizado_em',atualizado_em)) from public.apv_aprovacoes),'[]'::jsonb),
    'eventos', coalesce((select jsonb_agg(x order by x.criado_em) from (
        select id, list_id, versao, evento, por, nota, itens, criado_em, dow, hora
        from public.apv_eventos order by criado_em desc limit 1500) x),'[]'::jsonb));
end $$;

-- 4) Liderança do ministério abre o link (sem login). Só devolve o repertório daquele token.
create or replace function public.apv_ver(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.apv_aprovacoes; u record;
begin
  if coalesce(p_token,'') !~ '^[0-9a-f]{32}$' then return jsonb_build_object('ok', false); end if;
  select * into a from public.apv_aprovacoes where token = p_token;
  if not found or a.snapshot = '{}'::jsonb then return jsonb_build_object('ok', false); end if;
  if not exists (select 1 from public.apv_eventos where token = a.token and versao = a.versao and evento = 'visto' and criado_em > now() - interval '3 hours') then
    insert into public.apv_eventos (list_id, token, versao, evento) values (a.list_id, a.token, a.versao, 'visto');
  end if;
  select evento, por, nota, itens, criado_em into u from public.apv_eventos
   where token = a.token and versao = a.versao and evento in ('aprovado','ajuste') order by criado_em desc limit 1;
  return jsonb_build_object('ok', true, 'versao', a.versao, 'status', a.status, 'culto', a.snapshot,
    'resposta', case when u.evento is null then null else jsonb_build_object('evento',u.evento,'por',u.por,'nota',u.nota,'itens',u.itens,'em',u.criado_em) end);
end $$;

-- 5) Liderança do ministério responde (sem login): aprovar ou sugerir alteração.
create or replace function public.apv_responder(p_token text, p_acao text, p_nome text, p_nota text, p_itens jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.apv_aprovacoes; nome text := left(btrim(coalesce(p_nome,'')),60); nota text := left(btrim(coalesce(p_nota,'')),1000);
begin
  if coalesce(p_token,'') !~ '^[0-9a-f]{32}$' then raise exception 'Link inválido.'; end if;
  if p_acao not in ('aprovado','ajuste') then raise exception 'Resposta inválida.'; end if;
  select * into a from public.apv_aprovacoes where token = p_token;
  if not found then raise exception 'Link inválido.'; end if;
  if nome = '' then raise exception 'Diga seu nome.'; end if;
  if p_acao = 'ajuste' and nota = '' and coalesce(jsonb_array_length(case when jsonb_typeof(p_itens)='array' then p_itens else '[]'::jsonb end),0) = 0 then
    raise exception 'Escreva o que sugere ou marque uma música.'; end if;
  if (select count(*) from public.apv_eventos where token = a.token and evento in ('aprovado','ajuste') and criado_em > now() - interval '1 minute') >= 8 then
    raise exception 'Calma! Muitas respostas em pouco tempo.'; end if;
  insert into public.apv_eventos (list_id, token, versao, evento, por, nota, itens)
  values (a.list_id, a.token, a.versao, p_acao, nome, nota, case when jsonb_typeof(p_itens)='array' then p_itens else null end);
  update public.apv_aprovacoes set status = p_acao, atualizado_em = now() where list_id = a.list_id;
  return jsonb_build_object('ok', true, 'status', p_acao);
end $$;

revoke all on function public.apv_enviar(text,jsonb,text)            from public, anon;
revoke all on function public.apv_registrar(text,text,text,text)     from public, anon;
revoke all on function public.apv_dados()                            from public, anon;
grant execute on function public.apv_enviar(text,jsonb,text)         to authenticated;
grant execute on function public.apv_registrar(text,text,text,text)  to authenticated;
grant execute on function public.apv_dados()                         to authenticated;
grant execute on function public.apv_ver(text)                       to anon, authenticated;
grant execute on function public.apv_responder(text,text,text,text,jsonb) to anon, authenticated;

select public.marcar_script(26, 'aprovacao_repertorio');
select 'ok: aprovação do repertório por link' as status;
