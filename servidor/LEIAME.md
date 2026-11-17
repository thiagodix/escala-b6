# Scripts do banco (Supabase)

Rode no SQL Editor, na ordem do número. Todos podem ser repetidos sem problema.
O script 25 cria a tabela `scripts_executados`; depois dele, todo script novo termina com
`select public.marcar_script(NN, 'nome');`. Para conferir o que já rodou:

    select * from public.scripts_executados order by numero;

Os scripts 01 a 09 são anteriores a esse controle e não aparecem na tabela.

## 27_login_obrigatorio.sql
Fecha o Fervor: sem login não se lê nada. Antes de rodar, todo integrante ativo precisa ter
acesso criado (Ajustes > Acessos > Criar acesso); o script para e lista quem falta. No fim,
mostra o que um visitante ainda alcança (só login, registro de erros e aviso no celular).
