# Automatic Version Control System

This project implements an automatic version control system that ensures version consistency between `package.json` and the application's displayed version.

## How It Works

The system automatically generates `src/utils/version.ts` from `package.json` to prevent version mismatches.

### Key Components

1. **Version Generator Script** (`scripts/generate-version.js`)
   - Reads version from `package.json`
   - Generates TypeScript version file with build timestamp
   - Runs automatically during development and build

2. **Automatic Integration**
   - Runs before every `npm run dev` and `npm run build`
   - Pre-commit hook ensures version sync before commits
   - GitHub Actions verify version consistency in CI/CD

3. **Version Bump Scripts**
   - Easy version management with automatic sync
   - Supports semantic versioning (patch, minor, major)

## Usage

### Development
```bash
# Start development (auto-generates version)
npm run dev

# Build for production (auto-generates version)
npm run build
```

### Version Management
```bash
# Check current version sync
npm run version:check

# Manually generate version file
npm run version:generate

# Bump version (patch: 1.5.4 → 1.5.5)
npm run version:bump:patch

# Bump version (minor: 1.5.4 → 1.6.0)
npm run version:bump:minor

# Bump version (major: 1.5.4 → 2.0.0)
npm run version:bump:major
```

### Version Bump Workflow
1. Run version bump: `npm run version:bump:patch`
2. Review changes: `git diff`
3. Commit: `git add . && git commit -m "chore: bump version to X.X.X"`
4. Tag: `git tag vX.X.X`
5. Push: `git push && git push --tags`

## Benefits

✅ **No More Version Mismatches** - Version in admin dashboard always matches package.json
✅ **Automatic Sync** - Version file generated on every build
✅ **Developer-Friendly** - Works transparently during development
✅ **CI/CD Integration** - GitHub Actions ensure consistency
✅ **Easy Management** - Simple commands for version bumps

## Files Involved

- `package.json` - Source of truth for version
- `src/utils/version.ts` - Auto-generated (DO NOT EDIT MANUALLY)
- `scripts/generate-version.js` - Version file generator
- `scripts/bump-version.js` - Version bump automation
- `.husky/pre-commit` - Pre-commit hook for version sync
- `.github/workflows/version-check.yml` - CI/CD version verification

## Important Notes

⚠️ **Never edit `src/utils/version.ts` manually** - It's auto-generated
⚠️ **Always use npm scripts for version bumps** - Ensures proper sync
⚠️ **Version history in version.ts is manually managed** - Update when needed

This system eliminates the frustration of version mismatches and ensures the admin dashboard always shows the correct version! 🎉 