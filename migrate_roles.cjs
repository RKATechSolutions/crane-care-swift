const { createClient } = require('@supabase/supabase-js');
const url = "https://pchrnrvkkhplypautpcw.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjaHJucnZra2hwbHlwYXV0cGN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI3NjQ1MiwiZXhwIjoyMDg4ODUyNDUyfQ._1WPnPcGp803PmwrCRV7Neiu2UE8DisK3OxznH685-U";
const supabase = createClient(url, key);

async function run() {
  console.log("Creating user_roles table...");
  const { error: createError } = await supabase.rpc('exec_sql', { sql: `
    CREATE TABLE IF NOT EXISTS public.user_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      role text NOT NULL CHECK (role IN ('admin', 'technician')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      UNIQUE(user_id, role)
    );
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow authenticated read" ON public.user_roles FOR SELECT TO authenticated USING (true);
  ` });
  
  if (createError) {
    console.log("RPC exec_sql failed (expected if not defined). Trying alternative...");
    // If RPC fails, it means we don't have exec_sql.
    // We can't create tables via PostgREST. 
    // But we CAN check if there is an existing 'profiles' table or similar?
  }
}
run();
