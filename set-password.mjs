/**
 * One-shot script to set a password for an invited Atlas user.
 * Usage: node set-password.mjs <email> <password>
 */
import { createClient } from "./platform/node_modules/@supabase/supabase-js/dist/module/index.js";

const SUPABASE_URL = "https://nxmvslehqxvvcfunimvx.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bXZzbGVocXh2dmNmdW5pbXZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODAwODQ5OSwiZXhwIjoyMDkzNTg0NDk5fQ.SmEhZnMCAeNa1vzx-xIq2s6oBs_gs-QdJYC8pfReAjQ";

const [,, email, password] = process.argv;

if (!email || !password) {
  console.error("Usage: node set-password.mjs <email> <password>");
  process.exit(1);
}

if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Find user by email
const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
if (listError) { console.error("Failed to list users:", listError.message); process.exit(1); }

const user = users.find(u => u.email === email);
if (!user) { console.error(`No Supabase user found for ${email}`); process.exit(1); }

// Set password directly
const { error } = await supabase.auth.admin.updateUserById(user.id, { password });
if (error) { console.error("Failed to set password:", error.message); process.exit(1); }

console.log(`✅ Password set for ${email} — they can log in now at https://zing-atlas-platform-production.up.railway.app/login`);
