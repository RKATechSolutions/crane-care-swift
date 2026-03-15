const { createClient } = require('@supabase/supabase-js');
const url = "https://pchrnrvkkhplypautpcw.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjaHJucnZra2hwbHlwYXV0cGN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI3NjQ1MiwiZXhwIjoyMDg4ODUyNDUyfQ._1WPnPcGp803PmwrCRV7Neiu2UE8DisK3OxznH685-U";
const supabase = createClient(url, key);
const targetPassword = process.env.RESET_PASSWORD_TARGET || 'password123';

async function run() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.log("ERROR LISTING USERS:", error.message);
    return;
  }
  
  console.log("Resetting passwords for", users.length, "users to target password...");
  for (const user of users) {
    const { error: updError } = await supabase.auth.admin.updateUserById(user.id, {
      password: targetPassword,
      email_confirm: true
    });
    if (updError) {
      console.log("FAILED to reset", user.email, ":", updError.message);
    } else {
      console.log("SUCCESS reset for", user.email);
    }
  }
}
run();
