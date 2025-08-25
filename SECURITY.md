# Security Policy

## Supported Versions

Currently supported versions for security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability, please report it through GitHub's private vulnerability reporting feature.

### How to Report

1. **DO NOT** create a public issue for security vulnerabilities
2. Go to the Security tab in this repository
3. Click "Report a vulnerability"
4. Provide detailed information about the vulnerability:
   - Type of issue (XSS, SQL Injection, etc.)
   - Affected components
   - Steps to reproduce
   - Proof of concept (if applicable)
   - Potential impact

### What to Expect

- **Acknowledgment**: We will acknowledge receipt within 48 hours
- **Initial Assessment**: Within 7 days, we'll provide an initial assessment
- **Resolution Timeline**: We aim to resolve critical vulnerabilities within 30 days
- **Communication**: We'll keep you informed throughout the resolution process
- **Recognition**: Security researchers will be credited (unless they prefer to remain anonymous)

### Security Measures in Place

- Automated CodeQL scanning on all pull requests
- Dependency vulnerability scanning via Dependabot
- Regular security audits via GitHub Actions
- Input validation and sanitization throughout the application
- Row Level Security (RLS) on all database tables
- CSRF protection for all payment operations
- Rate limiting on sensitive endpoints

## Security Best Practices

For contributors:
- Never commit secrets or API keys
- Use environment variables for sensitive configuration
- Validate and sanitize all user input
- Use parameterized queries to prevent SQL injection
- Implement proper authentication and authorization checks
- Keep dependencies up to date

## Contact

For urgent security matters, you can also contact:
- Security Team: security@caraudioevents.com
- Project Maintainer: @jryan2014

Thank you for helping keep Car Audio Events secure!