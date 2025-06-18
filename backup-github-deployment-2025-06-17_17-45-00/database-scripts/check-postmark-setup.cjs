// Check Postmark Account Setup
const postmark = require("postmark");

// Initialize Postmark client with your API key
const client = new postmark.ServerClient("24ac66c6-e80f-4778-b57c-d4f74477bcfa");

async function checkPostmarkSetup() {
    console.log('🔍 Checking Postmark account setup...\n');
    
    try {
        // Check server info
        console.log('📊 Getting server information...');
        const serverInfo = await client.getServer();
        console.log('✅ Server Name:', serverInfo.Name);
        console.log('✅ Server ID:', serverInfo.ID);
        console.log('✅ Server State:', serverInfo.State);
        console.log('✅ SMTP API Activated:', serverInfo.SmtpApiActivated);
        console.log('✅ Raw Email Enabled:', serverInfo.RawEmailEnabled);
        console.log('✅ Delivery Type:', serverInfo.DeliveryType);
        console.log('');
        
        // Check sender signatures
        console.log('📧 Getting sender signatures...');
        const signatures = await client.getSenderSignatures();
        
        if (signatures.SenderSignatures && signatures.SenderSignatures.length > 0) {
            console.log('✅ Found', signatures.SenderSignatures.length, 'sender signature(s):');
            signatures.SenderSignatures.forEach((sig, index) => {
                console.log(`   ${index + 1}. ${sig.EmailAddress}`);
                console.log(`      - Confirmed: ${sig.Confirmed}`);
                console.log(`      - SPF Verified: ${sig.SPFVerified}`);
                console.log(`      - DKIM Verified: ${sig.DKIMVerified}`);
                console.log(`      - Return Path Domain Verified: ${sig.ReturnPathDomainVerified}`);
                console.log('');
            });
        } else {
            console.log('❌ No sender signatures found!');
            console.log('');
        }
        
        // Check domains
        console.log('🌐 Getting domains...');
        const domains = await client.getDomains();
        
        if (domains.Domains && domains.Domains.length > 0) {
            console.log('✅ Found', domains.Domains.length, 'domain(s):');
            domains.Domains.forEach((domain, index) => {
                console.log(`   ${index + 1}. ${domain.Name}`);
                console.log(`      - Verified: ${domain.SPFVerified && domain.DKIMVerified}`);
                console.log(`      - SPF Verified: ${domain.SPFVerified}`);
                console.log(`      - DKIM Verified: ${domain.DKIMVerified}`);
                console.log('');
            });
        } else {
            console.log('❌ No domains found!');
            console.log('');
        }
        
        console.log('📋 NEXT STEPS TO GET EMAIL WORKING:');
        console.log('');
        
        if (!signatures.SenderSignatures || signatures.SenderSignatures.length === 0) {
            console.log('1. 🔧 ADD SENDER SIGNATURES:');
            console.log('   - Go to your Postmark dashboard');
            console.log('   - Navigate to "Sender Signatures"');
            console.log('   - Add these email addresses:');
            console.log('     • admin@caraudioevents.com');
            console.log('     • support@caraudioevents.com');
            console.log('     • noreply@caraudioevents.com');
            console.log('   - Verify each email address by clicking the confirmation link');
            console.log('');
        }
        
        if (!domains.Domains || domains.Domains.length === 0) {
            console.log('2. 🌐 ADD DOMAIN (RECOMMENDED):');
            console.log('   - Go to your Postmark dashboard');
            console.log('   - Navigate to "Domains"');
            console.log('   - Add "caraudioevents.com"');
            console.log('   - Set up DKIM and SPF records in your DNS');
            console.log('   - This allows sending from any @caraudioevents.com address');
            console.log('');
        }
        
        console.log('3. 🧪 TEST MODE:');
        console.log('   - Your account appears to be in test mode');
        console.log('   - You can only send emails to verified sender signatures');
        console.log('   - Once you add sender signatures, you can test email functionality');
        console.log('');
        
        console.log('4. 🚀 PRODUCTION MODE:');
        console.log('   - After testing, you can request to move out of test mode');
        console.log('   - This allows sending to any email address');
        console.log('');
        
    } catch (error) {
        console.error('❌ Error checking Postmark setup:', error);
        
        if (error.code === 401) {
            console.log('🔑 API Key issue - please verify your Postmark API key is correct');
        } else if (error.code === 403) {
            console.log('🚫 Permission issue - API key may not have the required permissions');
        }
    }
}

// Run the check
checkPostmarkSetup(); 