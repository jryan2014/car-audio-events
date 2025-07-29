# Edge Browser Environment Variable Fix

## Issue
Edge browser showing 401 "Invalid API key" errors while Chrome works fine.

## Root Cause
Edge browser may have cached an older version of the app from before we moved API keys to environment variables, or Edge handles Vite environment variables differently.

## Solutions (Try in order)

### 1. Clear Edge Browser Cache
1. Open Edge browser
2. Press `Ctrl + Shift + Delete`
3. Select "All time" for time range
4. Check all boxes (especially "Cached images and files")
5. Click "Clear now"
6. Restart Edge browser
7. Visit http://localhost:5173

### 2. Hard Refresh
1. In Edge, navigate to http://localhost:5173
2. Press `Ctrl + F5` (or `Ctrl + Shift + R`)
3. This forces a complete page reload ignoring cache

### 3. Developer Tools Cache Disable
1. Open Edge DevTools (`F12`)
2. Go to Network tab
3. Check "Disable cache" checkbox
4. Keep DevTools open and refresh the page

### 4. Private/Incognito Mode Test
1. Open a new InPrivate window in Edge (`Ctrl + Shift + N`)
2. Navigate to http://localhost:5173
3. Check if the issue persists

### 5. Restart Development Server
```bash
# Kill all node processes and restart
taskkill /F /IM node.exe 2>nul & npm run dev
```

### 6. Check Console Output
After applying the fixes above, check the browser console for:
- `🔍 Supabase Configuration Debug:` - Should show valid URL and key
- `✅ Supabase client created successfully` - Confirms client initialization

## Prevention
To prevent this issue in the future:
1. Always use hard refresh (`Ctrl + F5`) when switching between browsers during development
2. Keep Edge DevTools open with "Disable cache" enabled during development
3. Consider using Edge's InPrivate mode for testing

## If Issue Persists
If none of the above solutions work, the problem may be a deeper Edge compatibility issue with Vite's environment variable loading. In that case:
1. Use Chrome for development
2. Report the issue to the development team
3. The production deployment (Netlify) should work fine in all browsers