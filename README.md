# SafariCharge — Solar Dashboard

A web dashboard for monitoring, managing, and analyzing solar energy systems.

**Live (Vercel):** https://sc-solar-dashboard.vercel.app/

## Key features

- Solar performance visualization (charts + tables)
- Data upload/download workflow
- Report generation endpoints
- Prisma-backed data layer

## Tech stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Prisma

## Run locally

`ash
npm install
npm run dev
`

Open http://localhost:3000

## Environment

Copy .env.example ? .env and set:

- DATABASE_URL (required)
- GEMINI_API_KEY (optional)

## Deployment

Vercel:
- Connect the repo
- Set env vars (DATABASE_URL, optional GEMINI_API_KEY)

## License

Intended for research, development, and renewable energy monitoring applications.