# Security Test File

This file is created to test the pull request dependency review workflow.

## Test Objectives:
1. Verify Dependency Review action runs on pull requests
2. Confirm all security workflows are functioning
3. Test automated security maintenance

## Expected Results:
- Dependency Review should run and check for vulnerable dependencies
- CodeQL should analyze the code
- Secret scanning should check for exposed secrets
- Trivy should scan for vulnerabilities

This is a test file that will be removed after validation.

## Update: Testing Dependency Graph
The dependency graph has been enabled. This update will trigger a new check.

## Update 2: All Security Features Enabled
- ✅ Dependency graph: ENABLED
- ✅ Dependabot alerts: ENABLED  
- ✅ Dependabot security updates: ENABLED
This should allow the Dependency Review to pass.