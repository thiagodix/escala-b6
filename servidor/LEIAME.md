# Scripts do banco (Supabase)

Rode no SQL Editor, na ordem do número. Todos podem ser repetidos sem problema.
O script 25 cria a tabela `scripts_executados`; depois dele, todo script novo termina com
`select public.marcar_script(NN, 'nome');`. Para conferir o que já rodou:

    select * from public.scripts_executados order by numero;

Os scripts 01 a 09 são anteriores a esse controle e não aparecem na tabela.
