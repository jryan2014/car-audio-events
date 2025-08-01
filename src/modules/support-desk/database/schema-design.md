# Support Desk Database Schema Design

## Overview
This document outlines the database schema for the Car Audio Events support desk system. The design follows PostgreSQL best practices with proper normalization, indexes, and RLS policies.

## Core Tables

### 1. support_tickets
Primary table for all support requests.

```sql
CREATE TABLE support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT UNIQUE NOT NULL, -- Format: CAE-YYYY-MM-XXXXX
  
  -- User/Organization relationship
  user_id UUID REFERENCES auth.users(id),
  organization_id INTEGER REFERENCES organizations(id),
  
  -- Ticket details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open, in_progress, waiting_on_user, resolved, closed
  priority TEXT NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
  
  -- Request categorization
  request_type_id UUID REFERENCES support_request_types(id),
  event_id UUID REFERENCES events(id), -- Optional event reference
  
  -- Routing information
  routing_type TEXT NOT NULL DEFAULT 'internal', -- internal, organization, hybrid
  assigned_to_org_id INTEGER REFERENCES organizations(id),
  assigned_to_user_id UUID REFERENCES auth.users(id),
  
  -- Custom fields data (JSONB for flexibility)
  custom_fields JSONB DEFAULT '{}',
  
  -- Metadata
  source TEXT NOT NULL DEFAULT 'web', -- web, email, api
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  
  -- Spam/Security
  spam_score NUMERIC(3,2),
  is_spam BOOLEAN DEFAULT FALSE,
  captcha_verified BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_organization_id ON support_tickets(organization_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX idx_support_tickets_assigned_to_user_id ON support_tickets(assigned_to_user_id);
CREATE INDEX idx_support_tickets_request_type_id ON support_tickets(request_type_id);
```

### 2. support_request_types
Defines types of support requests (customizable by admin).

```sql
CREATE TABLE support_request_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- billing, technical, event, general
  
  -- Routing rules
  default_routing TEXT DEFAULT 'internal', -- internal, organization, hybrid
  default_priority TEXT DEFAULT 'normal',
  
  -- Configuration
  is_active BOOLEAN DEFAULT TRUE,
  requires_event BOOLEAN DEFAULT FALSE,
  
  -- Who can use this type
  allowed_roles TEXT[] DEFAULT ARRAY['public', 'free_competitor', 'competitor_pro', 'retailer', 'manufacturer', 'organization'],
  
  -- Display order
  sort_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. support_ticket_messages
Conversation thread for each ticket.

```sql
CREATE TABLE support_ticket_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  
  -- Message content
  message TEXT NOT NULL,
  is_internal_note BOOLEAN DEFAULT FALSE, -- Internal notes not visible to users
  
  -- Attachments
  attachments JSONB DEFAULT '[]', -- Array of {url, filename, size, type}
  
  -- Metadata
  message_type TEXT DEFAULT 'reply', -- reply, status_change, assignment_change, system
  metadata JSONB DEFAULT '{}', -- For system messages
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);
CREATE INDEX idx_support_ticket_messages_created_at ON support_ticket_messages(created_at);
```

### 4. support_organization_settings
Configuration for organizations that have support portal access.

```sql
CREATE TABLE support_organization_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id INTEGER UNIQUE REFERENCES organizations(id),
  
  -- Access control
  is_provisioned BOOLEAN DEFAULT FALSE,
  provisioned_at TIMESTAMPTZ,
  provisioned_by UUID REFERENCES auth.users(id),
  
  -- Support team members (users with org_support role)
  support_team_user_ids UUID[] DEFAULT '{}',
  
  -- Configuration
  auto_assign_enabled BOOLEAN DEFAULT FALSE,
  email_notifications_enabled BOOLEAN DEFAULT TRUE,
  
  -- Custom branding
  support_email TEXT,
  support_phone TEXT,
  custom_message TEXT, -- Shown to users when ticket is routed to this org
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5. support_field_definitions
Defines custom fields that can be added to support tickets.

```sql
CREATE TABLE support_field_definitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Field metadata
  field_key TEXT UNIQUE NOT NULL, -- Unique identifier for the field
  label TEXT NOT NULL,
  description TEXT,
  field_type TEXT NOT NULL, -- text, textarea, date, dropdown_static, dropdown_dynamic_event, file, checkbox
  
  -- Field configuration
  is_required BOOLEAN DEFAULT FALSE,
  default_value TEXT,
  placeholder TEXT,
  
  -- For dropdown fields
  options JSONB DEFAULT '[]', -- For static dropdowns [{value, label}]
  
  -- Validation rules
  validation_rules JSONB DEFAULT '{}', -- {min_length, max_length, pattern, etc}
  
  -- Display
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6. support_field_visibility_rules
Controls when custom fields are shown.

```sql
CREATE TABLE support_field_visibility_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  field_definition_id UUID REFERENCES support_field_definitions(id) ON DELETE CASCADE,
  
  -- Conditions (all must match for field to show)
  request_type_ids UUID[] DEFAULT '{}', -- Empty means all types
  user_roles TEXT[] DEFAULT '{}', -- Empty means all roles
  
  -- Context
  show_on_frontend BOOLEAN DEFAULT TRUE,
  show_on_backend BOOLEAN DEFAULT TRUE,
  
  -- Additional conditions (JSONB for flexibility)
  additional_conditions JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_support_field_visibility_field_id ON support_field_visibility_rules(field_definition_id);
```

### 7. support_ticket_assignments
Track assignment history for tickets.

```sql
CREATE TABLE support_ticket_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  
  -- Assignment details
  assigned_from_user_id UUID REFERENCES auth.users(id),
  assigned_to_user_id UUID REFERENCES auth.users(id),
  assigned_to_org_id INTEGER REFERENCES organizations(id),
  
  -- Reason for assignment
  assignment_reason TEXT,
  
  -- Timestamps
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_support_ticket_assignments_ticket_id ON support_ticket_assignments(ticket_id);
CREATE INDEX idx_support_ticket_assignments_assigned_at ON support_ticket_assignments(assigned_at DESC);
```

### 8. support_email_verification_tokens
For public users who need to verify email before submitting tickets.

```sql
CREATE TABLE support_email_verification_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  
  -- Rate limiting
  ip_address INET,
  attempts INTEGER DEFAULT 0,
  
  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 hour',
  used_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_support_email_verification_email ON support_email_verification_tokens(email);
CREATE INDEX idx_support_email_verification_expires ON support_email_verification_tokens(expires_at);
```

### 9. support_rate_limits
Track rate limiting for spam prevention.

```sql
CREATE TABLE support_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Identifier (could be IP, email, user_id)
  identifier TEXT NOT NULL,
  identifier_type TEXT NOT NULL, -- ip, email, user_id
  
  -- Action being rate limited
  action TEXT NOT NULL, -- ticket_create, email_verify, message_send
  
  -- Counting
  attempt_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  
  -- Blocking
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_until TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_support_rate_limits_identifier ON support_rate_limits(identifier, identifier_type, action);
CREATE INDEX idx_support_rate_limits_window ON support_rate_limits(window_start);
```

## Helper Functions

### Generate ticket number
```sql
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_month TEXT;
  v_sequence INTEGER;
  v_ticket_number TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  v_month := TO_CHAR(NOW(), 'MM');
  
  -- Get next sequence number for this month
  SELECT COUNT(*) + 1 INTO v_sequence
  FROM support_tickets
  WHERE created_at >= DATE_TRUNC('month', NOW())
    AND created_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month';
  
  v_ticket_number := 'CAE-' || v_year || '-' || v_month || '-' || LPAD(v_sequence::TEXT, 5, '0');
  
  RETURN v_ticket_number;
END;
$$ LANGUAGE plpgsql;
```

### Update timestamps trigger
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_support_request_types_updated_at BEFORE UPDATE ON support_request_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
-- ... repeat for other tables
```

## RLS Policies Overview

### support_tickets policies:
1. Users can view their own tickets
2. Organization support staff can view tickets assigned to their org
3. CAE admin/support can view all tickets
4. Similar policies for insert/update operations

### support_ticket_messages policies:
1. Users can view messages on their tickets
2. Users can add messages to their own tickets
3. Support staff can view/add messages based on ticket assignment
4. Internal notes only visible to support staff

### Other tables:
- Most configuration tables (request types, field definitions) are read-only for non-admins
- Organization settings only editable by CAE admins
- Rate limiting tables are system-only access

## Migration Order
1. Create helper functions
2. Create core tables (support_tickets, support_request_types)
3. Create relationship tables (messages, assignments)
4. Create configuration tables (field definitions, visibility rules)
5. Create security tables (email verification, rate limits)
6. Apply RLS policies
7. Insert default data (request types, etc.)