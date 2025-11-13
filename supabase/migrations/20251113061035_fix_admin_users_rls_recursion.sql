-- Fix infinite recursion in admin_users RLS policies
-- The original policy tried to check admin_users to determine if someone can read admin_users (circular!)

-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins can view admin_users" ON admin_users;
DROP POLICY IF EXISTS "Superadmins can insert admins" ON admin_users;
DROP POLICY IF EXISTS "Superadmins can update admins" ON admin_users;

-- Allow any authenticated user to read admin_users
-- This is safe because middleware still enforces that only admins can access /admin routes
-- and this table only contains which users are admins (no sensitive data)
CREATE POLICY "Authenticated users can view admin_users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (true);

-- Only existing superadmins can insert new admins
-- Use the SECURITY DEFINER function to bypass RLS when checking
CREATE POLICY "Superadmins can insert admins"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (is_superadmin(auth.uid()));

-- Only existing superadmins can update admin_users
CREATE POLICY "Superadmins can update admins"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (is_superadmin(auth.uid()));

-- Only existing superadmins can delete admins
CREATE POLICY "Superadmins can delete admins"
  ON admin_users
  FOR DELETE
  TO authenticated
  USING (is_superadmin(auth.uid()));
