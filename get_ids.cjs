const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const url = "https://pchrnrvkkhplypautpcw.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjaHJucnZra2hwbHlwYXV0cGN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI3NjQ1MiwiZXhwIjoyMDg4ODUyNDUyfQ._1WPnPcGp803PmwrCRV7Neiu2UE8DisK3OxznH685-U";
const supabase = createClient(url, key);
async function run() {
  const { data: { users } } = await supabase.auth.admin.listUsers();
  users.forEach(u => console.log(u.email, u.id));
}
run();
