# Val Town CLI Deployment Setup

## Quick Setup

1. **Get Your Val Town Token**
   - Go to [val.town/settings/tokens](https://val.town/settings/tokens)
   - Create a new token
   - Copy the token value

2. **Set Environment Variable**
   ```bash
   export VALTOWN_TOKEN="your_token_here"
   ```

3. **Deploy Your App**
   ```bash
   npm run deploy
   ```

## Step-by-Step Instructions

### 1. Get Your Token
- Visit [val.town](https://val.town) and log in
- Go to Settings → Tokens
- Click "Create Token"
- Give it a name like "Kinobi Deployment"
- Copy the token (you won't see it again!)

### 2. Set the Token
```bash
# For this session only
export VALTOWN_TOKEN="your_token_here"

# Or add to your shell profile (~/.zshrc or ~/.bash_profile)
echo 'export VALTOWN_TOKEN="your_token_here"' >> ~/.zshrc
source ~/.zshrc
```

### 3. Deploy
```bash
# Make sure your deployment bundle is ready
./deploy.sh

# Deploy to Val Town
npm run deploy
```

### 4. Your App is Live!
Your app will be available at:
- `https://kinobi.val.town`
- `https://val.town/v/kinobi`

## Troubleshooting

### "Token not found"
- Make sure you've set the `VALTOWN_TOKEN` environment variable
- Check that the token is valid at [val.town/settings/tokens](https://val.town/settings/tokens)

### "Deployment failed"
- Check the error message for details
- Make sure all files are in the `kinobi-deploy` folder
- Verify your token has the right permissions

### "Val already exists"
- The script will update the existing val
- If you want a different name, edit `deploy-val.js` and change `valName`

## Security Notes

- Keep your token secret
- Don't commit it to version control
- Use environment variables only
- You can revoke tokens at any time

## Updates

To update your deployed app:
1. Make changes to your code
2. Run `./deploy.sh` to update the bundle
3. Run `npm run deploy` to deploy
4. Your app updates instantly! 