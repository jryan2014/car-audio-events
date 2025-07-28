# Security Audit Command

Please check through all the code you just wrote and make sure it follows security best practices. Make sure there is no sensitive information in the front end and there are no vulnerabilities that can be exploited.

## What this command does:
1. Reviews recently written code for security vulnerabilities
2. Checks for XSS, injection attacks, and other common web vulnerabilities
3. Ensures no sensitive data (API keys, secrets, passwords) are exposed in frontend code
4. Validates input sanitization and output encoding
5. Verifies proper authentication and authorization checks
6. Fixes any identified security issues

## Security checks performed:
- Cross-Site Scripting (XSS) prevention
- SQL/NoSQL injection protection
- Sensitive data exposure
- Input validation and sanitization
- Output encoding
- Authentication/authorization verification
- Secure communication (HTTPS)
- Error handling that doesn't leak information
- Dependency vulnerabilities
- Path traversal prevention

## Usage:
```
/security-audit
```

This command will analyze the most recently modified files and provide a comprehensive security report with fixes for any identified vulnerabilities.