// Test Postmark Welcome Email (CommonJS)
const postmark = require("postmark");

// Initialize Postmark client with your API key
const client = new postmark.ServerClient("24ac66c6-e80f-4778-b57c-d4f74477bcfa");

// Welcome email template
const welcomeEmailHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to Car Audio Events</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎵 Welcome to Car Audio Events! 🎵</h1>
            <p>Your gateway to the car audio competition world</p>
        </div>
        <div class="content">
            <h2>Hello Admin!</h2>
            <p>Welcome to the Car Audio Events platform! We're excited to have you join our community of car audio enthusiasts and competitors.</p>
            
            <p><strong>What you can do now:</strong></p>
            <ul>
                <li>🏆 Browse upcoming car audio competitions</li>
                <li>📅 Register for events in your area</li>
                <li>🏢 Manage organizations and sanctioning bodies</li>
                <li>👥 Connect with other car audio enthusiasts</li>
                <li>📊 Access your admin dashboard</li>
            </ul>
            
            <div style="text-align: center;">
                <a href="https://caraudioevents.com/login" class="button">Login to Your Dashboard</a>
            </div>
            
            <p>If you have any questions or need assistance, don't hesitate to reach out to our support team.</p>
            
            <p>Best regards,<br>
            <strong>The Car Audio Events Team</strong></p>
        </div>
        <div class="footer">
            <p>Car Audio Events Platform | <a href="https://caraudioevents.com">caraudioevents.com</a></p>
            <p>This email was sent to admin@caraudioevents.com</p>
        </div>
    </div>
</body>
</html>
`;

const welcomeEmailText = `
Welcome to Car Audio Events!

Hello Admin!

Welcome to the Car Audio Events platform! We're excited to have you join our community of car audio enthusiasts and competitors.

What you can do now:
- Browse upcoming car audio competitions
- Register for events in your area  
- Manage organizations and sanctioning bodies
- Connect with other car audio enthusiasts
- Access your admin dashboard

Login to your dashboard: https://caraudioevents.com/login

If you have any questions or need assistance, don't hesitate to reach out to our support team.

Best regards,
The Car Audio Events Team

Car Audio Events Platform | caraudioevents.com
This email was sent to admin@caraudioevents.com
`;

// Send the welcome email
async function sendWelcomeEmail() {
    try {
        console.log('📧 Sending welcome email...');
        console.log('📧 From: welcome@caraudioevents.com (using verified sender)');
        console.log('📧 To: admin@caraudioevents.com');
        
        const result = await client.sendEmail({
            "From": "welcome@caraudioevents.com",
            "To": "admin@caraudioevents.com",
            "Subject": "🎵 Welcome to Car Audio Events Platform! (Test Email)",
            "HtmlBody": welcomeEmailHTML,
            "TextBody": welcomeEmailText,
            "MessageStream": "outbound",
            "Tag": "welcome-email-test",
            "Metadata": {
                "user-type": "admin",
                "email-type": "welcome",
                "platform": "car-audio-events",
                "test": "true"
            }
        });

        console.log('✅ Welcome email sent successfully!');
        console.log('📬 Message ID:', result.MessageID);
        console.log('📧 From: welcome@caraudioevents.com');
        console.log('📧 To: admin@caraudioevents.com');
        console.log('📧 Subject: 🎵 Welcome to Car Audio Events Platform! (Test Email)');
        console.log('\n🎉 Check your inbox at admin@caraudioevents.com!');
        console.log('\n📝 Note: This test uses welcome@caraudioevents.com as sender.');
        console.log('📝 If this fails, you need to add welcome@caraudioevents.com as a Sender Signature in your Postmark account.');
        
    } catch (error) {
        console.error('❌ Failed to send welcome email:', error);
        
        if (error.code) {
            console.error('Error Code:', error.code);
        }
        if (error.message) {
            console.error('Error Message:', error.message);
        }
        
        console.log('\n💡 Troubleshooting tips:');
        console.log('1. Make sure welcome@caraudioevents.com is verified as a Sender Signature in Postmark');
        console.log('2. Check that your Postmark account is not in sandbox mode');
        console.log('3. Verify the API key is correct and has send permissions');
    }
}

// Run the test
sendWelcomeEmail(); 