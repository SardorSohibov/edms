
/*
  # Seed Initial Admin User

  Creates a demo admin profile record. The auth user must be created via
  Supabase Dashboard > Authentication > Users with email: admin@edms.com

  Also seeds demo directors and employees (profiles only, linked after auth user creation).

  ## Demo Accounts (to be created via Supabase Auth Dashboard):
  - admin@edms.com / Admin@123456
  - Then use the app to create directors and employees.

  This migration only adds a trigger that auto-creates profiles for
  new auth users who self-register (admin-only flow handled in app).
*/

-- Function to handle new user auto-profile creation from invite
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create profile if one doesn't already exist (edge function handles creation)
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
    INSERT INTO profiles (id, full_name, email, role, department, avatar_initials)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'role', 'employee'),
      COALESCE(NEW.raw_user_meta_data->>'department', ''),
      upper(left(COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), 2))
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auto-create profile when auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();
