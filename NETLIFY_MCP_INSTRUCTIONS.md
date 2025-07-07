# 🚀 Netlify Environment Variable Management - AI Agent Instructions

## 🚨 CRITICAL LESSONS LEARNED

### ❌ **WHAT DOESN'T WORK (Common Mistakes)**
1. **NO Netlify MCP Server**: There is no separate MCP server for Netlify
2. **NO localhost:3000 connection**: Don't try to connect to localhost ports for Netlify
3. **NO @modelcontextprotocol/server-netlify**: This package doesn't exist
4. **NO Manual MCP Connection**: Don't try to establish manual MCP connections for Netlify

### ✅ **WHAT ACTUALLY WORKS**
- **Use Netlify CLI Directly**: The `netlify` command is the correct approach
- **Link First**: Always run `netlify link` before managing environment variables
- **Use env:set Commands**: Use `netlify env:set` for all environment variable management

## 📋 **CORRECT WORKFLOW FOR AI AGENTS**

### **Step 1: Verify Netlify CLI Installation**
```bash
netlify --version
```
If not installed, user needs to install it first.

### **Step 2: Link the Project**
```bash
netlify link
```
Choose option 1 (Use current git remote origin) when prompted.

### **Step 3: Add Environment Variables**
```bash
netlify env:set VARIABLE_NAME "variable_value" --force
```

### **Step 4: Verify Variables**
```bash
netlify env:list
```
Answer "y" when prompted to show values.

### **Step 5: Trigger Deployment**
```bash
netlify deploy --prod
```

## 🔧 **PRACTICAL EXAMPLES**

### **Adding Stripe Keys**
```bash
# Production keys
netlify env:set VITE_STRIPE_PUBLISHABLE_KEY pk_live_... --force
netlify env:set STRIPE_SECRET_KEY sk_live_... --force

# Test keys  
netlify env:set VITE_STRIPE_TEST_PUBLISHABLE_KEY pk_test_... --force
netlify env:set STRIPE_TEST_SECRET_KEY sk_test_... --force
```

### **Adding Other Keys**
```bash
netlify env:set VITE_SUPABASE_URL https://your-project.supabase.co --force
netlify env:set VITE_SUPABASE_ANON_KEY eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... --force
```

## 🛡️ **SAFETY PROTOCOLS**

### **Always Use --force Flag**
- Prevents interactive prompts that can cause hanging
- Overwrites existing values without confirmation

### **Handle Long Commands**
- Break very long environment variable values into multiple lines if needed
- Use quotes around values with special characters

### **Verify After Each Addition**
```bash
netlify env:list
```

## 🚨 **TROUBLESHOOTING GUIDE**

### **"No project id found" Error**
```bash
netlify link
```
Select option 1 (Use current git remote origin)

### **Commands Hanging/Prompting**
- Use `--force` flag to bypass confirmations
- Use `echo "y" | netlify command` for yes/no prompts

### **PowerShell Issues**
- Long commands may wrap - this is normal
- Use `Ctrl+C` to stop hanging commands
- Start new shell if needed

## 📊 **VERIFICATION CHECKLIST**

After adding environment variables:
- ✅ Run `netlify env:list` to verify all variables are present
- ✅ Check that values are correct (not truncated)
- ✅ Trigger deployment with `netlify deploy --prod`
- ✅ Verify site functionality after deployment

## 🎯 **KEY TAKEAWAYS FOR AI AGENTS**

1. **NO MCP Server for Netlify**: Use CLI directly
2. **Link First**: Always `netlify link` before env management
3. **Use --force**: Prevent interactive prompts
4. **Verify Everything**: Check `netlify env:list` after changes
5. **Deploy**: Run `netlify deploy --prod` to activate changes

## 💡 **WORKING EXAMPLE SESSION**

```bash
# Link the project
netlify link

# Add environment variables
netlify env:set VITE_STRIPE_PUBLISHABLE_KEY pk_live_51RXVWeBoKeabwApYIMCtVH3aX98Vprw5sGtZQbr4PXRa2hPkySIY2iuhKipheihx8mMFji0WsGEXsTKiJQAEJGaY00nSbGuNVU --force

netlify env:set STRIPE_SECRET_KEY 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 --force

# Verify variables
netlify env:list

# Deploy changes
netlify deploy --prod
```

## 🎯 **FINAL NOTES**

- **The MCP server shown in terminal output is for Supabase database only**
- **Netlify management is done through CLI commands, not MCP connections**
- **Always link project first, then manage environment variables**
- **Use --force flag to prevent interactive prompts**
- **Verify changes with netlify env:list before deploying**

This approach worked successfully to add all Stripe environment variables to the production Netlify site. 