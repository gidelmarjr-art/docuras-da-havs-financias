-- RECEBIMENTOS (Doçuras da Hav's): execute uma única vez no SQL Editor do Supabase.
-- Amplia a tabela `entradas` para registrar como cada venda foi paga e quem lançou.
alter table public.entradas
  add column if not exists forma_recebimento text not null default 'pix',
  add column if not exists cliente text,
  add column if not exists taxa numeric(12,2) not null default 0,
  add column if not exists registrado_por text;

alter table public.entradas drop constraint if exists entradas_forma_valida;
alter table public.entradas add constraint entradas_forma_valida
  check (forma_recebimento in ('dinheiro', 'pix', 'credito', 'debito'));

alter table public.entradas drop constraint if exists entradas_taxa_valida;
alter table public.entradas add constraint entradas_taxa_valida
  check (taxa >= 0 and taxa < valor);

create index if not exists entradas_forma_idx on public.entradas (user_id, forma_recebimento, data_entrada);

notify pgrst, 'reload schema';
