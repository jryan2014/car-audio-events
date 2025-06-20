# Version Synchronization Guide

This guide outlines the mandatory procedure for ensuring the application's version file (`src/utils/version.ts`) is correctly synchronized with the `package.json` file before committing any new features.

Following this process prevents the CI/CD pipeline from failing due to version mismatches.

---

## Synchronization Procedure

This process should be followed locally **before** you `git add` and `git commit` your feature changes.

### Step 1: Ensure Local Branch is Up-to-Date

Before starting, always pull the latest changes from the remote repository to avoid merge conflicts.

```bash
git pull origin main
```

### Step 2: Generate the Correct Version File

Run the version generation script. This is the most critical step. It reads the version from `package.json` and writes it into `src/utils/version.ts` along with a new build timestamp.

```bash
npm run version:generate
```

### Step 3: Add All Your Changes (Including the Version File)

When you stage your files for a commit, you must now **always include `src/utils/version.ts`** along with your feature files.

```bash
# Add your feature files
git add src/components/MyNewComponent.tsx

# ALWAYS add the version file as well
git add src/utils/version.ts
```

### Step 4: Commit and Push

Commit your changes with a descriptive message. The version file will now be correctly bundled with your feature.

```bash
git commit -m "feat: Add new feature and sync version file"
git push origin main
```

---

By consistently following these four steps, the version file in the repository will always be in sync, ensuring that all automated checks and deployments proceed smoothly. 