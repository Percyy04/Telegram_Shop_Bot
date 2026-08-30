/**
 * CLI script to create an admin user in Supabase Auth & admin_users table.
 * Usage: npx tsx scripts/seed-admin.ts <EMAIL> <PASSWORD> [DISPLAY_NAME]
 */

import { createClient } from '@supabase/supabase-js';

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const displayName = process.argv[4] || 'Admin';

  if (!email || !password) {
    console.error('Usage: npx tsx scripts/seed-admin.ts <EMAIL> <PASSWORD> [DISPLAY_NAME]');
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in process.env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Creating/fetching Supabase user for: ${email}`);

  // Create user using service role
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  let userId = authData?.user?.id;

  if (authErr) {
    console.warn(`User creation note (${authErr.message}). Fetching existing user...`);
    const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) throw listErr;
    const existing = usersData.users.find((u) => u.email === email);
    if (!existing) throw new Error('User does not exist and creation failed');
    userId = existing.id;
  }

  if (!userId) throw new Error('Failed to get user ID');

  // Insert into admin_users table
  const { error: adminErr } = await supabase
    .from('admin_users')
    .upsert({
      id: userId,
      email,
      display_name: displayName,
    });

  if (adminErr) {
    console.error('Failed to insert into admin_users table:', adminErr);
    process.exit(1);
  }

  console.log(`✅ Admin user "${email}" (${userId}) configured successfully!`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
