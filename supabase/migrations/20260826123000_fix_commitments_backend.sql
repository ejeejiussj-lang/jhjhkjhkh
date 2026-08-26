ALTER TABLE public.commitments ADD COLUMN IF NOT EXISTS creditor TEXT;
ALTER TABLE public.commitments ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid();