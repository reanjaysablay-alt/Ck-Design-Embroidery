STITCHHOUSE - FIXED PROJECT (read me first)

The original archive was MISSING the app/ folder, which Next.js needs.
Copy your original app/ folder (and public/ if you have one) into this
project, so you have:

  stitchhouse/app/layout.js
  stitchhouse/app/page.js
  stitchhouse/app/globals.css
  ... etc.

Then:
 1. Create .env.local from .env.local.example (local use only).
 2. In Vercel > Project Settings > Environment Variables, add every
    variable from .env.local.example. Vercel does NOT read .env.local.
 3. Push to GitHub (or deploy the folder) and redeploy.
 4. In Supabase > Authentication > URL Configuration, set Site URL to
    your Vercel domain.

Changes made: upload limits lowered to 4MB (Vercel body cap ~4.5MB),
next.config.js bodySizeLimit set to 4mb, removed .env.local (contains
secrets - rotate those keys if shared), removed .bak/empty log files.
