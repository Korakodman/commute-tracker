This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Authentication Setup

Commute Tracker uses Better Auth with a single owner account. Runtime signup is disabled; there is no public registration page or API.

1. Copy `.env.example` to `.env.local`.
2. Set `MONGODB_URL`, `BETTER_AUTH_URL`, and a random `BETTER_AUTH_SECRET`.
3. Use a MongoDB Replica Set or MongoDB Atlas in environments that need transactions.
4. Create the first owner account from a terminal only:

```bash
AUTH_BOOTSTRAP_CONFIRM=CREATE_SINGLE_OWNER npm run bootstrap-owner
```

The bootstrap script asks for the owner email, name, and password interactively. It does not accept the password as a command-line argument, does not print it, rejects `commute-tracker-test`, and stops if an account already exists.

For PowerShell:

```powershell
$env:AUTH_BOOTSTRAP_CONFIRM="CREATE_SINGLE_OWNER"
npm run bootstrap-owner
```

The application protects Dashboard pages and data APIs with a Better Auth database-backed session. Sessions expire after 12 hours and may refresh approximately once per hour. Authentication rate limiting is configured for five email sign-in attempts per 60 seconds using the Better Auth database storage.

Integration tests require all of the following before they can clean the Test Database:

```text
TEST_DB_URL=mongodb://127.0.0.1:27017/commute-tracker-test?replicaSet=rs0
TEST_DB_CLEANUP_ALLOWED=true
```

Never use the Test Database URL for Production, and never commit `.env.local` or real secrets.
