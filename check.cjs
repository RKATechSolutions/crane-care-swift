const { createClient } = require('@supabase/supabase-js');
const url = "https://pchrnrvkkhplypautpcw.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjaHJucnZra2hwbHlwYXV0cGN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI3NjQ1MiwiZXhwIjoyMDg4ODUyNDUyfQ._1WPnPcGp803PmwrCRV7Neiu2UE8DisK3OxznH685-U";
const supabase = createClient(url, key);
console.log("Checking project:", url);
supabase.auth.admin.listUsers().then(({ data, error }) => {
  if (error) {
    console.error("ERROR", error.message);
  } else {
    console.log("Found", data.users.length, "users");
    data.users.forEach(u => console.log("-", u.email));
  }
}).catch(err => console.error("FATAL", err));
