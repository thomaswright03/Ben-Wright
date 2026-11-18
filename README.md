# Ben Wright · Golf recruiting site

Recruiting profile for Ben Wright, Class of 2029 golfer from Salt Lake City, Utah.

- `/` — the public profile. Coaches enter a 4-digit code first (or open a personal link like `/?c=1234`), and each visit is logged. A "View the profile anyway" link lets anyone without a code in, and those visits are counted separately.
- `/questions` — the family area, behind a password. Post questions for Ben to answer, add coach codes, and see which coaches have opened the profile.

Plain HTML/CSS/JS with two Vercel serverless functions in `api/`. No build step.

## Deploying on Vercel

1. **Import the repo** at vercel.com → Add New → Project → pick `Ben-Wright`. Framework preset: *Other*. Leave build settings empty.
2. **Add storage**: in the project, open *Storage* → *Create Database* → **Upstash for Redis** (free tier is plenty) and connect it to the project. It sets `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically (`UPSTASH_REDIS_REST_URL`/`_TOKEN` also work).
3. **Set the family password**: *Settings* → *Environment Variables* → add `FAMILY_PASSWORD`.
4. **Redeploy** so the functions pick up the new variables.

## Filling in the profile

Every spot still waiting on real info is marked with a dashed yellow `TBD` tag in `index.html`. Replace the tag with the real value.
