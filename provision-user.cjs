/**
 * Provision an Atlas team member who exists in the DB but has no Supabase auth account.
 * Creates the auth user (or finds an existing one), sets the password,
 * and backfills supabaseUserId on the team_members row.
 *
 * Usage: node provision-user.cjs <email> <password>
 */
const path = require("path");
const { createClient } = require(path.join(__dirname, "platform/node_modules/@supabase/supabase-js"));
const { PrismaClient } = require(path.join(__dirname, "platform/node_modules/@prisma/client"));
const { PrismaPg } = require(path.join(__dirname, "platform/node_modules/@prisma/adapter-pg"));
const { Pool } = require(path.join(__dirname, "platform/node_modules/pg"));

const SUPABASE_URL = "https://nxmvslehqxvvcfunimvx.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bXZzbGVocXh2dmNmdW5pbXZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODAwODQ5OSwiZXhwIjoyMDkzNTg0NDk5fQ.SmEhZnMCAeNa1vzx-xIq2s6oBs_gs-QdJYC8pfReAjQ";

const [,, email, password] = process.argv;

if (!email || !password) {
  console.error("Usage: node provision-user.cjs <email> <password>");
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  // 1. Check if Supabase auth user already exists
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) { console.error("Failed to list users:", listError.message); process.exit(1); }

  let authUser = users.find(u => u.email === email);

  if (authUser) {
    console.log(`Found existing Supabase auth user: ${authUser.id}`);
  } else {
    // 2. Create the auth user
    console.log(`No Supabase auth user found for ${email} — creating one...`);
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) { console.error("Failed to create user:", createError.message); process.exit(1); }
    authUser = created.user;
    console.log(`Created Supabase auth user: ${authUser.id}`);
  }

  // 3. Set/confirm password on existing user
  const { error: pwError } = await supabase.auth.admin.updateUserById(authUser.id, { password });
  if (pwError) { console.error("Failed to set password:", pwError.message); process.exit(1); }
  console.log(`Password set.`);

  // 4. Backfill supabaseUserId on the team_members row if missing
  try {
    const member = await prisma.teamMember.findFirst({
      where: { email },
    });

    if (!member) {
      console.warn(`No team_members row found for ${email} — skipping DB backfill.`);
    } else if (member.supabaseUserId === authUser.id) {
      console.log(`team_members row already linked to this auth user.`);
    } else {
      await prisma.teamMember.update({
        where: { id: member.id },
        data: { supabaseUserId: authUser.id },
      });
      console.log(`Backfilled supabaseUserId on team_members row (id: ${member.id}).`);
    }
  } catch (dbErr) {
    console.warn(`DB backfill skipped (DATABASE_URL not set or Prisma error): ${dbErr.message}`);
  } finally {
    await prisma.$disconnect();
  }

  console.log(`\n✅ ${email} is ready to log in at https://zing-atlas-platform-production.up.railway.app/login`);
}

run();
