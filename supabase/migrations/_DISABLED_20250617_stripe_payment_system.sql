/*
  # Stripe Payment System Migration
  
  This migration enables the complete Stripe payment system with:
  1. Payments table for transaction records
  2. Event registrations integration
  3. Proper RLS policies and security
  4. Indexes for performance
*/

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id text PRIMARY KEY, -- Use Stripe Payment Intent ID as primary key
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL, -- Amount in cents
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL,
  metadata jsonb DEFAULT '{}',
  stripe_payment_intent_id text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_id ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Enable RLS on payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies for payments
CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin policies for payments
CREATE POLICY "Admins can view all payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = auth.uid() 
      AND public.users.membership_type = 'admin'
    )
  );

-- Create trigger for payments updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update event_registrations table to include payment integration
ALTER TABLE event_registrations 
ADD COLUMN IF NOT EXISTS payment_id text REFERENCES payments(id);

ALTER TABLE event_registrations 
ADD COLUMN IF NOT EXISTS registration_date timestamptz DEFAULT now();

-- Create index for event_registrations payment lookup
CREATE INDEX IF NOT EXISTS idx_event_registrations_payment_id ON event_registrations(payment_id);

-- Update event_registrations RLS policies to handle payments
CREATE POLICY "Users can view their own event registrations" ON event_registrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own event registrations" ON event_registrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin policies for event_registrations
CREATE POLICY "Admins can view all event registrations" ON event_registrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE public.users.id = auth.uid() 
      AND public.users.membership_type = 'admin'
    )
  );

-- Create a view for payment history with event details
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
  e.start_date as event_date,
  u.name,
  u.email
FROM payments p
LEFT JOIN event_registrations er ON p.id = er.payment_id
LEFT JOIN events e ON er.event_id = e.id
LEFT JOIN users u ON p.user_id = u.id;

-- Enable RLS on the view
ALTER VIEW payment_history SET (security_invoker = true);

-- Create function to get user payment history
CREATE OR REPLACE FUNCTION get_user_payment_history(user_uuid uuid)
RETURNS TABLE (
  payment_id text,
  amount integer,
  currency text,
  status text,
  event_title text,
  event_date date,
  created_at timestamptz
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is requesting their own data or is admin
  IF auth.uid() != user_uuid AND NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE public.users.id = auth.uid() 
    AND public.users.membership_type = 'admin'
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

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON payments TO authenticated;
GRANT INSERT ON payments TO authenticated;
GRANT SELECT ON event_registrations TO authenticated;
GRANT INSERT ON event_registrations TO authenticated;
GRANT SELECT ON payment_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_payment_history TO authenticated; 