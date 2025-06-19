// Test notifications for the current user
// Run with: node test-notifications.js

import { createClient } from '@supabase/supabase-js';

// Your Supabase configuration (from env-remote)
const supabaseUrl = 'https://nqvisvranvjaghvrdaaz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xdmlzdnJhbnZqYWdodnJkYWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MDY2NzcsImV4cCI6MjA2NTE4MjY3N30.OWwP8kH9qTKxgEHCC6ru0QSAJ5KhOupCxMUyxHuYWVY';

const supabase = createClient(supabaseUrl, supabaseKey);

const testUserId = '29b931f5-c02e-4562-b249-278f86663b62';

async function testNotifications() {
  console.log('🧪 Testing notification system...');
  
  try {
    // 1. Check if notification tables exist
    console.log('\n1️⃣ Checking notification tables...');
    
    const { data: types, error: typesError } = await supabase
      .from('notification_types')
      .select('*')
      .limit(5);
    
    if (typesError) {
      console.error('❌ notification_types table error:', typesError.message);
      return;
    }
    
    console.log('✅ notification_types table exists:', types?.length || 0, 'types');
    
    // 2. Check user_notifications table
    const { data: notifications, error: notifError } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', testUserId)
      .limit(1);
    
    if (notifError) {
      console.error('❌ user_notifications table error:', notifError.message);
      return;
    }
    
    console.log('✅ user_notifications table exists. Current notifications:', notifications?.length || 0);
    
    // 3. Get system_announcement type ID
    const systemType = types?.find(t => t.name === 'system_announcement');
    if (!systemType) {
      console.error('❌ system_announcement type not found');
      return;
    }
    
    // 4. Create a test notification
    console.log('\n2️⃣ Creating test notification...');
    
    const testNotification = {
      user_id: testUserId,
      notification_type_id: systemType.id,
      title: '🎉 Notification System Test',
      message: 'Your notification system is working perfectly! Check the bell icon in the header.',
      action_url: '/dashboard',
      metadata: { test: true, created_at: new Date().toISOString() },
      priority: 4,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      sent_at: new Date().toISOString()
    };
    
    const { data: newNotif, error: createError } = await supabase
      .from('user_notifications')
      .insert(testNotification)
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Failed to create notification:', createError.message);
      return;
    }
    
    console.log('✅ Test notification created with ID:', newNotif.id);
    
    // 5. Check total notifications
    console.log('\n3️⃣ Checking notification counts...');
    
    const { data: allNotifs, error: countError } = await supabase
      .from('user_notifications')
      .select('id, is_read')
      .eq('user_id', testUserId);
    
    if (countError) {
      console.error('❌ Failed to count notifications:', countError.message);
      return;
    }
    
    const total = allNotifs?.length || 0;
    const unread = allNotifs?.filter(n => !n.is_read).length || 0;
    
    console.log(`✅ Total notifications: ${total}`);
    console.log(`🔴 Unread notifications: ${unread}`);
    
    console.log('\n🎯 SUCCESS! Your notification system is working!');
    console.log('👉 Check the bell icon in your app header - you should see a red badge with the unread count!');
    console.log('👉 Click the bell to see your notifications dropdown!');
    console.log('👉 Visit /notifications to see the full management page!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testNotifications(); 