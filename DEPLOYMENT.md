# Deploying Kinobi to Val Town

## Prerequisites

1. **Val Town Account**: Sign up at [val.town](https://val.town)
2. **Project Ready**: Ensure your Kinobi project is working locally

## Method 1: Web Interface Deployment (Recommended)

1. **Login to Val Town**
   - Go to [val.town](https://val.town)
   - Sign in to your account

2. **Create New Val**
   - Click "New Val" or "+" button
   - Choose "Upload Files" option

3. **Upload Project Files**
   - Upload the following files and directories:
     - `src/` (entire directory)
     - `kinobi_alpha.png`
     - `package.json`
     - `bun.lockb`
     - `val.json`

4. **Configure Val**
   - Set the entry point to: `src/server.ts`
   - Set runtime to: `bun`
   - Add environment variable: `NODE_ENV=production`

5. **Deploy**
   - Click "Deploy" or "Save"
   - Your app will be available at: `https://your-username.kinobi.val.town`

## Method 2: CLI Deployment (If Available)

If Val Town CLI becomes available:

```bash
# Install CLI (when available)
# curl -fsSL https://cli.val.town/install.sh | sh

# Login to Val Town
val login

# Deploy from project directory
val deploy

# Or deploy specific files
val deploy --entrypoint src/server.ts --runtime bun
```

## Method 3: Manual File Upload

1. **Prepare Files**
   ```bash
   # Create deployment bundle
   mkdir kinobi-deploy
   cp -r src/ kinobi-deploy/
   cp kinobi_alpha.png kinobi-deploy/
   cp package.json kinobi-deploy/
   cp bun.lockb kinobi-deploy/
   cp val.json kinobi-deploy/
   ```

2. **Upload to Val Town**
   - Go to val.town dashboard
   - Create new val
   - Upload the `kinobi-deploy` folder contents

## Configuration

### val.json
```json
{
  "name": "kinobi",
  "description": "Smart chore tracker with time cycles, point scoring, and leaderboards",
  "runtime": "bun",
  "entrypoint": "src/server.ts",
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Environment Variables
- `NODE_ENV`: Set to "production" for optimized builds
- Database will be automatically created in Val Town's environment

## Post-Deployment

1. **Test Your App**
   - Visit your deployed URL
   - Test all features: adding chores, completing tasks, leaderboard
   - Verify the Kinobi logo loads correctly

2. **Share Your App**
   - Share the URL with household members
   - Each person can use the same sync code to access the same data

3. **Monitor Usage**
   - Check Val Town dashboard for usage metrics
   - Monitor for any errors or performance issues

## Troubleshooting

### Common Issues

1. **Logo Not Loading**
   - Ensure `kinobi_alpha.png` is uploaded
   - Check file path in server.ts

2. **Database Issues**
   - Val Town provides SQLite support
   - Database will be created automatically

3. **Build Errors**
   - Check that all dependencies are in package.json
   - Ensure TypeScript compilation works locally

### Support

- Val Town Documentation: [docs.val.town](https://docs.val.town)
- Kinobi Issues: Check the project repository
- Community: Val Town Discord or community forums

## Updates

To update your deployed app:

1. Make changes locally
2. Test thoroughly
3. Re-upload files to Val Town
4. Redeploy the val

Your app will be updated with zero downtime! 