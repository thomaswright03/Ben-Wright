# Ben Wright · Golf recruiting site

Recruiting profile for Ben Wright, Class of 2029 golfer from Salt Lake City, Utah.

- `/` — the public profile. Coaches enter a 4-digit code first (or open a personal link like `/?c=1234`), and each visit is logged. A "View the profile anyway" link lets anyone without a code in, and those visits are counted separately.
- `/questions` — behind `FAMILY_PASSWORD`. Post questions for Ben to answer.
- `/admin` — behind `ADMIN_PASSWORD` (or `FAMILY_PASSWORD` if that isn't set). Create coach codes, copy each coach's personal link, and see who has viewed the profile.

Plain HTML/CSS/JS with two Vercel serverless functions in `api/`. No build step.

## Deploying on Vercel

1. **Import the repo** at vercel.com → Add New → Project → pick `Ben-Wright`. Framework preset: *Other*. Leave build settings empty.
2. **Add storage**: in the project, open *Storage* and connect either **Redis** (sets `REDIS_URL`) or **Upstash for Redis** (sets `KV_REST_API_URL`/`KV_REST_API_TOKEN`). Either works, with or without a custom prefix.
3. **Set the passwords**: *Settings* → *Environment Variables* → add `FAMILY_PASSWORD` (for /questions) and, optionally, `ADMIN_PASSWORD` (for /admin, so Ben's password can't create codes).
4. **Redeploy** so the functions pick up the new variables.

## Filling in the profile

Every spot still waiting on real info is marked with a dashed yellow `TBD` tag in `index.html`. Replace the tag with the real value.
