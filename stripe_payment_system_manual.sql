-- Stripe Payment System Manual Installation
-- Run this in your Supabase SQL Editor
-- This creates the complete payment system for event registration

-- 1. Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL,
  metadata jsonb DEFAULT '{}',
  stripe_payment_intent_id text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_id ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- 3. Enable RLS on payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 4. Create policies for payments
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own payments" ON payments;
CREATE POLICY "Users can insert their own payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
CREATE POLICY "Admins can view all payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.membership_type = 'admin'
    )
  );

-- 5. Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Create trigger for payments updated_at
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Update event_registrations table to include payment integration
ALTER TABLE event_registrations 
ADD COLUMN IF NOT EXISTS payment_id uuid;

ALTER TABLE event_registrations 
ADD COLUMN IF NOT EXISTS registration_date timestamptz DEFAULT now();

-- 8. Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'event_registrations_payment_id_fkey'
  ) THEN
    ALTER TABLE event_registrations 
    ADD CONSTRAINT event_registrations_payment_id_fkey 
    FOREIGN KEY (payment_id) REFERENCES payments(id);
  END IF;
END $$;

-- 9. Create index for event_registrations payment lookup
CREATE INDEX IF NOT EXISTS idx_event_registrations_payment_id ON event_registrations(payment_id);

-- 10. Update event_registrations RLS policies
DROP POLICY IF EXISTS "Users can view their own event registrations" ON event_registrations;
CREATE POLICY "Users can view their own event registrations" ON event_registrations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own event registrations" ON event_registrations;
CREATE POLICY "Users can insert their own event registrations" ON event_registrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all event registrations" ON event_registrations;
CREATE POLICY "Admins can view all event registrations" ON event_registrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.membership_type = 'admin'
    )
  );

-- 11. Create payment history view
CREATE OR REPLACE VIEW payment_history AS
SELECT 
  p.id,
  p.user_id,
  p.amount,
  p.currency,
  p.status,
  p.metadata,
  p.created_at,
  p.updated_at,
  er.event_id,
  e.title as event_title,
  e.date as event_date,
  prof.first_name,
  prof.last_name,
  prof.email
FROM payments p
LEFT JOIN event_registrations er ON p.id = er.payment_id
LEFT JOIN events e ON er.event_id = e.id
LEFT JOIN profiles prof ON p.user_id = prof.id;

-- 12. Create function to get user payment history
CREATE OR REPLACE FUNCTION get_user_payment_history(user_uuid uuid)
RETURNS TABLE (
  payment_id uuid,
  amount integer,
  currency text,
  status text,
  event_title text,
  event_date timestamptz,
  created_at timestamptz
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() != user_uuid AND NOT EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.membership_type = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    ph.id,
    ph.amount,
    ph.currency,
    ph.status,
    ph.event_title,
    ph.event_date,
    ph.created_at
  FROM payment_history ph
  WHERE ph.user_id = user_uuid
  ORDER BY ph.created_at DESC;
END;
$$;

-- 13. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON payments TO authenticated;
GRANT INSERT ON payments TO authenticated;
GRANT SELECT ON event_registrations TO authenticated;
GRANT INSERT ON event_registrations TO authenticated;
GRANT SELECT ON payment_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_payment_history TO authenticated;

-- Success message
SELECT 'Stripe Payment System installed successfully!' as result; 