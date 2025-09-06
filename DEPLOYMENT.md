# Deployment Guide

## ⚠️ Important: Cloudflare Pages Limitation

Cloudflare Pages is **BLOCKED by Binance API** (returns error 451 - restricted location). This is because Cloudflare's edge servers are located in regions that Binance restricts.

## Recommended Deployment Options

### Option 1: Deploy to Vercel (RECOMMENDED)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow the prompts, it will work out of the box
```

### Option 2: Deploy to Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

### Option 3: Use a VPS/Cloud Server
Deploy to any VPS (DigitalOcean, AWS, etc.) where you can control the server location.

## Why This Happens

1. **Binance blocks certain IP ranges** - Including Cloudflare Workers/Pages edge locations
2. **CORS Policy** - Binance API doesn't allow direct browser requests (no CORS headers)
3. **Edge Runtime Limitations** - Some regions are geo-blocked by Binance

## Current Architecture

```
Browser → Your Domain → API Routes (Edge Functions) → Binance API
                              ↑
                    This fails on Cloudflare Pages
                    (Error 451: Restricted Location)
```

## Solution for Production

The API routes we created (`/api/binance/*`) work correctly as proxies. The issue is **only with Cloudflare Pages deployment region**.

### Quick Fix for Testing
If you must use Cloudflare Pages, you can:
1. Use a third-party CORS proxy service
2. Set up your own proxy server on a VPS
3. Use Binance Cloud API (requires API key)

## Vercel Deployment (Easiest Solution)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Deploy - it will work immediately

No additional configuration needed. Vercel's servers are not blocked by Binance.