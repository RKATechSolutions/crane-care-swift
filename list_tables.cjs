const { createClient } = require('@supabase/supabase-js');
const url = "https://pchrnrvkkhplypautpcw.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjaHJucnZra2hwbHlwYXV0cGN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI3NjQ1MiwiZXhwIjoyMDg4ODUyNDUyfQ._1WPnPcGp803PmwrCRV7Neiu2UE8DisK3OxznH685-U";
const supabase = createClient(url, key);

async function run() {
  console.log("Listing tables...");
  const tables = ['profiles', 'users', 'technicians', 'staff', 'user_roles'];
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('count', { count: 'exact', head: true });
    if (!error) {
       console.log("Table exists:", t, "Count:", count);
       if (t === 'user_roles') {
          const { data } = await supabase.from(t).select('*');
          console.log("Data in", t, ":", data);
       }
    } else if (error.code !== 'PGRST116' && error.code !== '42P01') {
       console.log("Table", t, "error:", error.message);
    }
  }
}

run();
