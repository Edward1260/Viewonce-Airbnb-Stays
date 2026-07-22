# Deploying Viewonce Airbnb Stays to Vercel

This file contains the recommended steps to validate Vercel settings and create a preview (or production) deployment. I cannot run the Vercel deploy from here because the CLI requires an authenticated session.

1) Verify repo & build settings in Vercel
- Project Framework: Next.js
- Root Directory: repository root (the repo contains Next app files at root)
- Build Command: `npm run build`
- Install Command: leave default (Vercel will run `npm install`) or use `npm ci`
- Output Directory: leave empty (Next.js handles output)

2) Required environment variables
- NEXT_PUBLIC_SUPABASE_URL -> your Supabase URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY -> your Supabase anon/public key
- Any backend secrets used by other services (set as Environment Variables in Vercel)

3) Locally: verify build (already done here)
```bash
npm install
npm run build
```

4) Login and deploy with Vercel CLI (pick one method)

- Interactive login (recommended):
```bash
npx vercel login
npx vercel --prebuilt
```

- Non-interactive using a token (set `VERCEL_TOKEN` in your shell or CI env):
```bash
export VERCEL_TOKEN=YOUR_TOKEN_HERE
npx vercel --prebuilt --yes
```

Notes:
- If you see the "specified token is not valid" error, run `npx vercel login` locally to re-authenticate.
- If Next.js warns about multiple lockfiles, I added `outputFileTracingRoot` to `next.config.mjs` to force correct tracing root.
- If Vercel still picks the wrong project root, open the Project Settings in the Vercel dashboard and set the Root Directory explicitly.

5) After deploy: check deployment logs
- Vercel dashboard -> Deployments -> open recent deploy -> View Build Logs.
- If build fails, copy the first TypeScript/Next error and share it.

6) Optional cleanup
- If you intentionally keep a top-level `package-lock.json` outside the repo, consider removing it or moving it into the project to avoid Next's workspace-root detection warnings.

If you'd like, I can: (A) attempt another preview deploy after you run `npx vercel login` locally and share the CLI session, or (B) walk through any deployment log errors you paste here. Which do you prefer? 
