# Troubleshooting Reel Creation

## Error: "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"

This error means the API is returning an HTML error page instead of JSON, indicating a server-side crash.

### Quick Diagnostics

1. **Test the API Health**
   
   Open in your browser: http://localhost:3000/api/test-reel
   
   This will show if FFmpeg and AWS are configured correctly.

2. **Check Browser Console**
   
   - Open Developer Tools (F12)
   - Go to Console tab
   - Look for any error messages
   - The full HTML error may be logged there

3. **Check Server Terminal**
   
   Look at the terminal where you ran `npm run dev` for error messages.

### Common Causes & Solutions

#### 1. FFmpeg Not Installed

**Problem:** The `@ffmpeg-installer/ffmpeg` package may not have installed correctly.

**Solution:**
```bash
# Reinstall FFmpeg
npm uninstall fluent-ffmpeg @ffmpeg-installer/ffmpeg
npm install fluent-ffmpeg @ffmpeg-installer/ffmpeg --save

# Restart the dev server
# Press Ctrl+C to stop
npm run dev
```

#### 2. Node Version Incompatibility

**Problem:** Node.js 18 is being used but AWS SDK v3 recommends Node 20+.

**Check your Node version:**
```bash
node --version
```

**Solutions:**

Option A - Use compatible AWS SDK version:
```bash
npm install @aws-sdk/client-s3@^3.400.0 @aws-sdk/s3-request-presigner@^3.400.0
```

Option B - Upgrade Node.js (recommended):
```bash
# Using nvm
nvm install 20
nvm use 20

# Or using mise (if installed)
mise use node@20

# Then reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### 3. Missing Environment Variables

**Problem:** `.env.local` file is not being loaded.

**Solution:**
```bash
# Make sure .env.local exists in project root
ls -la .env.local

# If it doesn't exist:
cp .env.local.example .env.local

# Edit and add your AWS credentials
# Then restart the server
```

#### 4. Import/TypeScript Errors

**Problem:** Module import issues causing runtime errors.

**Solution:**
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
npm install

# Restart server
npm run dev
```

#### 5. Memory/Timeout Issues

**Problem:** Large images causing memory issues.

**Solution:**
- Use smaller images (under 5MB each)
- Reduce number of images (start with 2-3)
- Increase Node memory limit:

```bash
# In package.json, modify dev script:
"dev": "NODE_OPTIONS='--max-old-space-size=4096' next dev"
```

### Step-by-Step Debugging

#### Step 1: Verify Server is Running
```bash
# Should see: "ready - started server on 0.0.0.0:3000"
# If not, restart: npm run dev
```

#### Step 2: Test Simple API
```bash
# In browser or using curl:
curl http://localhost:3000/api/hello

# Should return JSON, not HTML
```

#### Step 3: Test Reel API Configuration
```bash
curl http://localhost:3000/api/test-reel

# Should show:
# - ffmpegInstalled: true
# - awsConfigured: true
```

#### Step 4: Check Server Logs

When you click "Create Reel", watch the terminal for errors like:
- `Error: Cannot find module...` - Missing dependency
- `ENOENT` - File not found
- `spawn ENOENT` - FFmpeg not found
- `AccessDenied` - AWS permission issue

#### Step 5: Test with Browser DevTools

1. Open DevTools (F12)
2. Go to Network tab
3. Click "Create Reel"
4. Find the `/api/create-reel` request
5. Click on it and check:
   - Status code (should be 500 if crashing)
   - Response tab (will show HTML error page)
   - Preview tab (may show error details)

### Error-Specific Solutions

#### "Cannot find module 'fluent-ffmpeg'"
```bash
npm install fluent-ffmpeg @types/fluent-ffmpeg
```

#### "spawn ffmpeg ENOENT"
```bash
# FFmpeg binary not found
npm rebuild @ffmpeg-installer/ffmpeg
```

#### "Cannot read property 'path' of undefined"
```bash
# @ffmpeg-installer/ffmpeg not installed correctly
npm install --save @ffmpeg-installer/ffmpeg
```

#### "Module not found: Can't resolve 'fs'"
```bash
# Add to next.config.js:
module.exports = {
  webpack: (config) => {
    config.resolve.fallback = { fs: false };
    return config;
  },
};
```

### Still Having Issues?

1. **Share the Error**
   - Copy the full error from browser console
   - Copy any error from the server terminal
   - Check the Response in Network tab

2. **Verify Setup**
   ```bash
   # Check all are installed
   npm list fluent-ffmpeg
   npm list @ffmpeg-installer/ffmpeg
   npm list @aws-sdk/client-s3
   
   # Verify .env.local
   cat .env.local
   ```

3. **Try Minimal Test**
   
   Create a simple test file `test-ffmpeg.js`:
   ```javascript
   const ffmpeg = require('@ffmpeg-installer/ffmpeg');
   console.log('FFmpeg path:', ffmpeg.path);
   ```
   
   Run it:
   ```bash
   node test-ffmpeg.js
   ```

### Production Deployment Issues

If this works locally but fails in production:

1. **Serverless Limitations**
   - FFmpeg may not work on some serverless platforms
   - Consider using AWS Lambda with FFmpeg layer
   - Or use a dedicated video processing service

2. **Timeout Issues**
   - Increase timeout limits in your hosting platform
   - For Vercel: Max 60 seconds on Pro plan
   - Consider background processing for longer videos

3. **File System Access**
   - Some platforms have read-only file systems
   - May need to use `/tmp` directory explicitly
   - Our code already uses `tmpdir()` which should work

### Quick Reset

If nothing works, try a complete reset:

```bash
# 1. Stop the server (Ctrl+C)

# 2. Clean everything
rm -rf node_modules package-lock.json .next

# 3. Reinstall
npm install

# 4. Restart
npm run dev

# 5. Test immediately
curl http://localhost:3000/api/test-reel
```

### Get More Help

If still stuck, provide:
1. Node version: `node --version`
2. OS: `uname -a` (Mac/Linux) or `ver` (Windows)
3. Error from browser console
4. Error from server terminal
5. Output of: `curl http://localhost:3000/api/test-reel`