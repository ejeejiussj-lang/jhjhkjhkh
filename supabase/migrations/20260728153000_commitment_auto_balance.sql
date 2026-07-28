create or replace function public.set_commitment_initial_balance()
returns trigger
language plpgsql
as $$
begin
  if new.balance is null or new.balance = 0 then
    new.balance := coalesce(new.value, 0);
  end if;

  if new.current_balance is null or new.current_balance = 0 then
    new.current_balance := new.balance;
  end if;

  return new;
end;
$$;

drop trigger if exists commitments_initial_balance on public.commitments;

create trigger commitments_initial_balance
before insert on public.commitments
for each row
execute function public.set_commitment_initial_balance();

update public.commitments c
set
  balance = coalesce(nullif(c.balance, 0), c.value, 0),
  current_balance = coalesce(nullif(c.balance, 0), c.value, 0) - coalesce(n.notes_total, 0)
from (
  select commitment_id, sum(value) as notes_total
  from public.service_notes
  where commitment_id is not null and commitment_id <> ''
  group by commitment_id
) n
where c.id = n.commitment_id
  and c.value > 0
  and (c.balance is null or c.balance = 0);

update public.commitments
set
  balance = value,
  current_balance = value
where value > 0
  and (balance is null or balance = 0)
  and id not in (
    select commitment_id
    from public.service_notes
    where commitment_id is not null and commitment_id <> ''
  );
