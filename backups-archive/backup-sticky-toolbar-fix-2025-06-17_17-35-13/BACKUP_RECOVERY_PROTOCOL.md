# BACKUP & RECOVERY PROTOCOL
## Comprehensive Data Protection Strategy

### 🛡️ BACKUP HIERARCHY

#### Level 1: Code Backups (Local)
**Frequency: Before ANY changes**
**Location: Project root directory**
**Format: `backup-[description]-[timestamp]`**

```bash
# Standard backup command:
$timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
mkdir "backup-[description]-$timestamp"
robocopy "src" "backup-[description]-$timestamp\src" /E /XD node_modules .git
copy "package.json" "backup-[description]-$timestamp\"
copy ".env" "backup-[description]-$timestamp\" 2>$null
```

#### Level 2: Database Backups (Supabase)
**Frequency: Before database changes**
**Location: Supabase Dashboard → Settings → Database → Backups**
**Method: Manual point-in-time snapshots**

#### Level 3: Full System Backups
**Frequency: After successful implementations**
**Includes: Code + Database + Configuration**

---

### 📋 BACKUP PROCEDURES

#### 🔄 Pre-Change Backup (MANDATORY)
**Execute before ANY modification:**

```bash
# 1. Create timestamped backup directory
$timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$description = "pre-[change-description]"
mkdir "backup-$description-$timestamp"

# 2. Backup source code
robocopy "src" "backup-$description-$timestamp\src" /E /XD node_modules .git

# 3. Backup configuration files
copy "package.json" "backup-$description-$timestamp\"
copy ".env" "backup-$description-$timestamp\" 2>$null
copy "vite.config.ts" "backup-$description-$timestamp\" 2>$null
copy "tsconfig.json" "backup-$description-$timestamp\" 2>$null
copy "tailwind.config.js" "backup-$description-$timestamp\" 2>$null

# 4. Backup any custom documentation
copy "*.md" "backup-$description-$timestamp\" 2>$null

# 5. Create backup manifest
echo "Backup created: $(Get-Date)" > "backup-$description-$timestamp\backup_info.txt"
echo "Description: $description" >> "backup-$description-$timestamp\backup_info.txt"
echo "System state: Working" >> "backup-$description-$timestamp\backup_info.txt"
```

#### 🔄 Database Backup (Before DB Changes)
**Manual process in Supabase:**

1. **Go to Supabase Dashboard**
2. **Navigate to Settings → Database → Backups**
3. **Click "Create Backup"**
4. **Label: `pre-[change-description]-[timestamp]`**
5. **Document backup ID for recovery**

#### 🔄 Post-Success Backup (After Successful Changes)
**Execute after verified working changes:**

```bash
# Create success backup
$timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$description = "working-[feature-name]"
mkdir "backup-$description-$timestamp"

# Full backup with success notation
robocopy "src" "backup-$description-$timestamp\src" /E /XD node_modules .git
copy "*.json" "backup-$description-$timestamp\" 2>$null
copy "*.md" "backup-$description-$timestamp\" 2>$null

echo "WORKING BACKUP - VERIFIED FUNCTIONAL" > "backup-$description-$timestamp\WORKING_STATE.txt"
echo "Backup created: $(Get-Date)" >> "backup-$description-$timestamp\WORKING_STATE.txt"
echo "Last tested: $(Get-Date)" >> "backup-$description-$timestamp\WORKING_STATE.txt"
```

---

### 🚨 RECOVERY PROCEDURES

#### 🔄 Quick Code Recovery (Minor Issues)
**When: Code changes break functionality**

```bash
# 1. Identify most recent working backup
ls -la backup-working-* | Sort-Object LastWriteTime -Descending

# 2. Stop development server
taskkill /F /IM node.exe 2>$null

# 3. Restore source code
$backupDir = "[most-recent-working-backup]"
robocopy "$backupDir\src" "src" /E /PURGE

# 4. Restore configuration if needed
copy "$backupDir\package.json" "." 2>$null
copy "$backupDir\.env" "." 2>$null

# 5. Restart development server
npm run dev
```

#### 🔄 Full System Recovery (Major Issues)
**When: Multiple systems broken or database issues**

```bash
# 1. STOP all processes
taskkill /F /IM node.exe 2>$null
Get-Process | Where-Object {$_.ProcessName -like "*vite*"} | Stop-Process -Force

# 2. Full code restoration
$backupDir = "backup-emergency-restore-2025-06-16_14-14-06"  # Known working state
Remove-Item "src" -Recurse -Force
robocopy "$backupDir\src" "src" /E

# 3. Restore all configurations
copy "$backupDir\*.json" "." 2>$null
copy "$backupDir\.env" "." 2>$null

# 4. Clean and restart
npm install
npm run dev
```

#### 🔄 Database Recovery (Critical Database Issues)
**When: Database changes break authentication/functionality**

1. **Go to Supabase Dashboard**
2. **Navigate to Settings → Database → Backups**
3. **Find pre-change backup**
4. **Click "Restore" on the backup**
5. **Confirm restoration**
6. **Wait for restoration completion**
7. **Test functionality**

#### 🔄 Nuclear Recovery (Complete System Failure)
**When: Everything is broken beyond repair**

```bash
# 1. Complete project restoration
cd ..
Remove-Item "project" -Recurse -Force -Confirm:$false
mkdir "project"
cd "project"

# 2. Restore from known working backup
$safeBackup = "..\backup-emergency-restore-2025-06-16_14-14-06"
robocopy "$safeBackup\src" "src" /E
copy "$safeBackup\*.*" "." 2>$null

# 3. Reinstall dependencies
npm install

# 4. Start fresh
npm run dev
```

---

### 📊 BACKUP VERIFICATION

#### 🔄 Backup Integrity Check
**Execute after creating any backup:**

```bash
# Verify backup completeness
$backupDir = "[backup-directory]"

# Check critical files exist
if (Test-Path "$backupDir\src\main.tsx") { Write-Host "✅ Main app file backed up" }
if (Test-Path "$backupDir\src\App.tsx") { Write-Host "✅ App component backed up" }
if (Test-Path "$backupDir\src\contexts\AuthContext.tsx") { Write-Host "✅ Auth context backed up" }
if (Test-Path "$backupDir\package.json") { Write-Host "✅ Package.json backed up" }

# Count files to verify backup size
$fileCount = (Get-ChildItem -Path "$backupDir" -Recurse -File).Count
Write-Host "📁 Total files backed up: $fileCount"

# Check backup size
$backupSize = (Get-ChildItem -Path "$backupDir" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "💾 Backup size: $([math]::Round($backupSize, 2)) MB"
```

#### 🔄 Restoration Test (Periodic)
**Monthly verification of backup viability:**

1. **Create test directory**
2. **Restore backup to test location**
3. **Verify npm install works**
4. **Verify app starts**
5. **Document test results**

---

### 📅 BACKUP SCHEDULE

#### Mandatory Backups:
- [ ] **Before database changes** (Always)
- [ ] **Before RLS modifications** (Always)
- [ ] **Before function changes** (Always)
- [ ] **After successful implementations** (Always)
- [ ] **Before major feature additions** (Always)

#### Recommended Backups:
- [ ] **Daily working state** (End of day if changes made)
- [ ] **Before dependency updates** (Package updates)
- [ ] **Before configuration changes** (Environment variables)

#### Emergency Backups:
- [ ] **When system is working after crisis** (Like today's restoration)
- [ ] **Before attempting experimental fixes**
- [ ] **When AI suggests risky changes**

---

### 🗂️ BACKUP ORGANIZATION

#### Naming Convention:
- `backup-working-[feature]-[timestamp]` - Verified working states
- `backup-pre-[change]-[timestamp]` - Before making changes
- `backup-emergency-[crisis]-[timestamp]` - Emergency snapshots
- `backup-daily-[timestamp]` - Regular daily backups

#### Directory Structure:
```
project/
├── backup-emergency-restore-2025-06-16_14-14-06/     # GOLDEN MASTER
├── backup-working-profile-fix-2025-06-16_15-30-00/   # Working states
├── backup-pre-database-security-2025-06-16_16-00-00/ # Pre-change
├── backup-daily-2025-06-16/                          # Daily backup
└── src/                                               # Current code
```

#### Retention Policy:
- **Emergency backups**: Keep forever
- **Working backups**: Keep for 30 days
- **Pre-change backups**: Keep for 14 days
- **Daily backups**: Keep for 7 days

---

### 🔍 BACKUP MONITORING

#### Health Checks:
```bash
# List all backups with dates
Get-ChildItem backup-* | Sort-Object LastWriteTime | Format-Table Name, LastWriteTime, @{Name="Size(MB)"; Expression={[math]::Round((Get-ChildItem $_.FullName -Recurse | Measure-Object Length -Sum).Sum / 1MB, 2)}}

# Find most recent working backup
$latestWorking = Get-ChildItem backup-working-* | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Write-Host "Most recent working backup: $($latestWorking.Name)"

# Check for critical backups
if (Test-Path "backup-emergency-restore-*") { 
    Write-Host "✅ Emergency restore backup exists" 
} else { 
    Write-Host "❌ No emergency backup found!" 
}
```

---

### 📋 RECOVERY TESTING

#### Monthly Recovery Test Protocol:
1. **Create test environment**
2. **Attempt backup restoration**
3. **Verify application functionality**
4. **Document any issues**
5. **Update recovery procedures if needed**

#### Recovery Success Criteria:
- [ ] Application starts without errors
- [ ] Authentication system works
- [ ] Database connections successful
- [ ] All major features functional
- [ ] No security vulnerabilities introduced

---

*This protocol ensures comprehensive data protection and rapid recovery capabilities for the Car Audio Events platform.* 