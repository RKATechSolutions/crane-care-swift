const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const url = "https://pchrnrvkkhplypautpcw.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjaHJucnZra2hwbHlwYXV0cGN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI3NjQ1MiwiZXhwIjoyMDg4ODUyNDUyfQ._1WPnPcGp803PmwrCRV7Neiu2UE8DisK3OxznH685-U";
const supabase = createClient(url, key);

async function run() {
  let output = "";
  try {
      const { data: { users }, error } = await supabase.auth.admin.listUsers();
      if (error) output = "ERROR: " + error.message;
      else {
        users.forEach(u => {
          output += `${u.email} | Confirmed: ${!!u.email_confirmed_at} | Last Sign In: ${u.last_sign_in_at}\n`;
        });
      }
  } catch (e) {
      output = "FATAL: " + e.message;
  }
  fs.writeFileSync('/tmp/conf.txt', output);
  console.log("Written to /tmp/conf.txt");
}
run();
