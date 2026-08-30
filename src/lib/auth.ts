/**
 * Admin authentication guard.
 * Verifies the user is logged in via Supabase Auth AND exists in admin_users table.
 */

import { createServerSupabaseClient } from './supabase/server';
import { getAdminSupabase } from './supabase/admin';

export interface AdminUser {
  id: string;
  email: string | null;
  display_name: string | null;
}

/**
 * Get the authenticated admin user, or null if not authorized.
 * Checks both Supabase Auth session and admin_users membership.
 */
export async function getAuthenticatedAdmin(): Promise<AdminUser | null> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Check admin_users table using service role (bypasses RLS)
  const adminSupabase = getAdminSupabase();
  const { data: adminUser, error: adminError } = await adminSupabase
    .from('admin_users')
    .select('id, email, display_name')
    .eq('id', user.id)
    .single();

  if (adminError || !adminUser) {
    return null;
  }

  return adminUser;
}

/**
 * Require admin authentication — throws if not authorized.
 * Use in route handlers.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return admin;
}
