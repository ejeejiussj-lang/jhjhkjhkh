CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL,
  company_name TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  expected_delivery_date TEXT,
  status TEXT DEFAULT 'Pendente',
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid();

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados leem ordens de compra" ON public.purchase_orders;
CREATE POLICY "Usuarios autenticados leem ordens de compra"
  ON public.purchase_orders
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados criam ordens de compra" ON public.purchase_orders;
CREATE POLICY "Usuarios autenticados criam ordens de compra"
  ON public.purchase_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Criador edita ordem de compra" ON public.purchase_orders;
CREATE POLICY "Criador edita ordem de compra"
  ON public.purchase_orders
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Criador exclui ordem de compra" ON public.purchase_orders;
CREATE POLICY "Criador exclui ordem de compra"
  ON public.purchase_orders
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());