/*
  # Add debug mode setting to admin_settings

  1. Changes
    - Insert login_debug_mode setting into admin_settings table
    - Set default value to false for security

  2. Security
    - Setting is marked as non-sensitive since it's just a boolean flag
    - Only admins can modify this setting through the admin panel
*/

-- Insert debug mode setting if it doesn't exist
INSERT INTO admin_settings (key_name, key_value, is_sensitive, updated_at)
VALUES ('login_debug_mode', 'false', false, now())
ON CONFLICT (key_name) DO NOTHING;