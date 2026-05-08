-- 1. Start fresh by removing the old table
DROP TABLE IF EXISTS journal_entries;

-- 2. Create the table with robust types
CREATE TABLE journal_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_id uuid NOT NULL,   -- This stores the unique ID from your browser
  date date NOT NULL,         -- The date of the entry
  text text NOT NULL,         -- The actual journal line
  year int4 NOT NULL,
  month int4 NOT NULL,
  day int4 NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  -- This constraint is CRITICAL for the "Save" (upsert) logic to work
  CONSTRAINT journal_date_unique UNIQUE (journal_id, date)
);

-- 3. Enable Security
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- 4. Create an "Unlimited" policy for anonymous users
-- This allows the app to work without a login screen
CREATE POLICY "Anonymous journal access" 
ON public.journal_entries 
FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);

