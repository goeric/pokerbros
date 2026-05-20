-- Run this to add yourself as superadmin
-- Make sure you're logged in first!
-- Usage: Copy and paste into Supabase Studio SQL Editor

INSERT INTO admin_users (id, email, is_superadmin, role)
SELECT
  id,
  email,
  true,
  'superadmin'::user_role
FROM auth.users
WHERE email = 'you@example.com'  -- replace with your Google login email
ON CONFLICT (id) DO UPDATE
SET
  is_superadmin = true,
  role = 'superadmin'::user_role;
