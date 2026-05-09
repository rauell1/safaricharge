# SafariCharge — Supabase Setup & Integration Testing Guide

This document explains how to configure Supabase for SafariCharge and how to verify that every auth and data function is working correctly.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Create a Supabase Project](#2-create-a-supabase-project)
3. [Set Environment Variables](#3-set-environment-variables)
4. [Database Setup (profiles table)](#4-database-setup-profiles-table)
5. [Configure Auth Providers](#5-configure-auth-providers)
   - [Email / Password](#51-email--password)
   - [Google OAuth](#52-google-oauth)
   - [Apple (iCloud) OAuth](#53-apple-icloud-oauth)
6. [Redirect URL Whitelist](#6-redirect-url-whitelist)
7. [Row-Level Security (RLS)](#7-row-level-security-rls)
8. [Verification Checklist](#8-verification-checklist)
   - [Auth flows](#auth-flows)
   - [Profile upsert](#profile-upsert)
   - [Dashboard data access](#dashboard-data-access)
9. [Common Errors & Fixes](#9-common-errors--fixes)

---

## 1. Prerequisites

| Requirement | Version |
|---|---|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| Supabase account | [supabase.com](https://supabase.com) |
| Google Cloud Console access | for Google OAuth |
| Apple Developer account | for Apple Sign-In |

---

## 2. Create a Supabase Project

1. Log in to [supabase.com](https://supabase.com) → **New project**.
2. Choose your organisation, enter a project name (e.g. `safaricharge`), pick a strong database password, and select a region close to Kenya (e.g. **Europe West** or **US East**).
3. Wait ~2 minutes for the project to provision.
4. Go to **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` *(keep this secret — server-side only)*

---

## 3. Set Environment Variables

Copy `.env.example` to `.env` and fill in the Supabase values:

```bash
cp .env.example .env
```

Minimum required for auth to work:

```env
NEXT_PUBLIC_SUPABASE_URL="https://<your-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
```

For the AI assistant (optional but recommended):

```env
GEMINI_API_KEY="<your-gemini-key>"
```

Restart the dev server after editing `.env`:

```bash
npm run dev
```

---

## 4. Database Setup (profiles table)

SafariCharge stores user profile data in a `profiles` table that is separate from Supabase's built-in `auth.users` table. The `/auth/callback` route upserts a row here after every sign-in using the service-role key (bypasses RLS).

Run the following SQL in the Supabase **SQL Editor** (`supabase.com → your project → SQL Editor → New query`):

```sql
-- Create the profiles table
create table if not exists public.profiles (
  id                  uuid        primary key references auth.users(id) on delete cascade,
  email               text,
  full_name           text,
  phone               text,
  organization        text,
  plan                text        not null default 'free',
  subscription_status text        not null default 'inactive',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Auto-update updated_at on every row change
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- Enable RLS
alter table public.profiles enable row level security;

-- Users can read and update only their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);
```

> **Note**: INSERT/UPSERT by anonymous users is intentionally blocked by RLS.
> The `/auth/callback` route uses the `SUPABASE_SERVICE_ROLE_KEY` (which bypasses RLS)
> to upsert the profile row on sign-in.

---

## 5. Configure Auth Providers

### 5.1 Email / Password

1. In Supabase dashboard → **Authentication → Providers → Email**.
2. Ensure **Enable Email provider** is toggled on.
3. For development, you can disable **Confirm email** so sign-ups work immediately.
4. For production, leave email confirmation enabled and configure your SMTP settings
   under **Authentication → SMTP Settings** (or use Supabase's built-in email).

**Resend (recommended for production email)**:
```env
# .env
RESEND_API_KEY="re_xxxxxxxxxxxxxx"
EMAIL_FROM="SafariCharge <noreply@safaricharge.ke>"
```

---

### 5.2 Google OAuth

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services → Credentials**.
2. Create an **OAuth 2.0 Client ID** (type: Web application).
3. Add the following to **Authorized redirect URIs**:
   ```
   https://<your-ref>.supabase.co/auth/v1/callback
   ```
   For local dev also add:
   ```
   http://localhost:3000/auth/callback
   ```
4. Copy the **Client ID** and **Client Secret**.
5. In Supabase dashboard → **Authentication → Providers → Google**:
   - Toggle **Enable Google provider**.
   - Paste your **Client ID** and **Client Secret**.
   - Save.

---

### 5.3 Apple (iCloud) OAuth

Apple Sign-In requires an Apple Developer account ($99/year) with an App ID and Services ID.

1. Log in to [developer.apple.com](https://developer.apple.com) → **Certificates, IDs & Profiles**.
2. **Create an App ID**:
   - Platform: Web, enable **Sign In with Apple**.
3. **Create a Services ID** (this is the OAuth client):
   - Identifier: e.g. `ke.safaricharge.web`
   - Enable **Sign In with Apple** → Configure:
     - Primary App ID: select the App ID from step 2.
     - Domains: your production domain (e.g. `safaricharge.ke`) **and** `<your-ref>.supabase.co`.
     - Return URLs:
       ```
       https://<your-ref>.supabase.co/auth/v1/callback
       ```
4. **Create a Key** for Sign In with Apple:
   - Download the `.p8` key file — you can only download it once.
   - Note the **Key ID**.
5. In Supabase dashboard → **Authentication → Providers → Apple**:
   - Toggle **Enable Apple provider**.
   - **Services ID**: the identifier from step 3 (e.g. `ke.safaricharge.web`).
   - **Team ID**: your 10-character Apple Team ID (top-right of developer.apple.com).
   - **Key ID**: from step 4.
   - **Private key**: paste the full contents of the `.p8` file.
   - Save.

> **Local development note**: Apple Sign-In does not support `localhost` redirect URIs.
> Use a tunnel such as [ngrok](https://ngrok.com) (`ngrok http 3000`) and register
> the HTTPS ngrok URL as an allowed Return URL in your Services ID configuration.

---

## 6. Redirect URL Whitelist

Supabase only redirects to URLs that are explicitly whitelisted.

1. Supabase dashboard → **Authentication → URL Configuration**.
2. **Site URL**: set to your production URL, e.g. `https://safaricharge.ke`.
3. **Additional Redirect URLs**: add all environments you use:
   ```
   http://localhost:3000/**
   https://safaricharge.ke/**
   https://*.vercel.app/**
   https://*.ngrok.io/**
   ```

The `/auth/callback` route in SafariCharge receives the `code` parameter and exchanges it for a session. Make sure your production deployment URL matches exactly what is set as **Site URL**.

---

## 7. Row-Level Security (RLS)

The SQL in [Section 4](#4-database-setup-profiles-table) sets up RLS policies that restrict users to their own profile row. Below is a summary of the effective permissions:

| Operation | Allowed by | Who |
|---|---|---|
| SELECT own row | RLS policy | Authenticated user |
| UPDATE own row | RLS policy | Authenticated user |
| INSERT / UPSERT | Service role key | `/auth/callback` server route only |
| DELETE | Not permitted | Nobody |

To verify RLS is working correctly:
```sql
-- Should return only the currently authenticated user's row:
select * from profiles;

-- Should return 0 rows when run as anon (no auth token):
select * from profiles;
```

---

## 8. Verification Checklist

Work through each item below after completing the setup. All tests can be done using the browser developer tools (Network tab) and Supabase dashboard.

---

### Auth Flows

#### ✅ Email sign-up

1. Go to `http://localhost:3000` — should redirect to `/login`.
2. Click **Create account**, fill in all fields, submit.
3. **Expected**: success message "Account created! Check your email to confirm, then sign in."
4. Check **Supabase → Authentication → Users** — your user should appear.
5. Click the confirmation link in the email.
6. Sign in with email + password — should redirect to `/dashboard`.

#### ✅ Email sign-in

1. Go to `/login`.
2. Enter your email and password, submit.
3. **Expected**: redirect to `/dashboard` with no errors.
4. Check browser cookies — `sb-<ref>-auth-token` should be set.

#### ✅ Google OAuth

1. Click **Continue with Google**.
2. **Expected**: Google consent screen opens.
3. Approve — should redirect back to `/auth/callback?next=/dashboard`, then to `/dashboard`.
4. Check **Supabase → Authentication → Users** — your Google user should appear with `provider = google`.

#### ✅ Apple OAuth

1. Click **Continue with Apple**.
2. **Expected**: Apple Sign-In screen opens.
3. Authenticate with your Apple ID.
4. **Expected**: redirect to `/auth/callback?next=/dashboard`, then to `/dashboard`.
5. Check **Supabase → Authentication → Users** — provider should be `apple`.

#### ✅ Session persistence

1. Sign in.
2. Close the browser tab (do **not** sign out).
3. Open `http://localhost:3000` in a new tab.
4. **Expected**: redirect directly to `/dashboard` (session cookie is still valid).

#### ✅ Session expiry redirect

1. In Supabase dashboard → **Authentication → Policies**, or via the Supabase client, manually expire a session.
2. Alternatively, wait for the 15-minute inactivity timeout implemented in the middleware.
3. Try to navigate to `/dashboard`.
4. **Expected**: redirect to `/login?reason=session_expired` with the appropriate warning message.

---

### Profile Upsert

After every OAuth sign-in, `/auth/callback` upserts a row in `public.profiles`.

#### ✅ Verify profile was created

Run in **Supabase → SQL Editor**:

```sql
select id, email, full_name, organization, plan, subscription_status, created_at
from profiles
order by created_at desc
limit 5;
```

**Expected**: a row for every user who has signed in, with `plan = 'free'` and `subscription_status = 'inactive'`.

#### ✅ Verify profile is not overwritten on re-login

1. Sign in once. Manually update `full_name` in Supabase table editor.
2. Sign in again with the same provider.
3. **Expected**: `full_name` is **not** reset (the upsert only sets non-empty values).

---

### Dashboard Data Access

#### ✅ API health check

```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

#### ✅ Profile API (authenticated)

```bash
# Get your session token from browser DevTools → Application → Cookies
# sb-<ref>-auth-token (base64 JSON — extract access_token field)

curl http://localhost:3000/api/profile \
  -H "Authorization: Bearer <access_token>"
# Expected: {"id":"...","email":"...","plan":"free",...}
```

#### ✅ Pricing page shows current plan

1. Sign in.
2. Navigate to `/pricing`.
3. **Expected**: a green badge "Current plan: Free Plan" appears at the top.

#### ✅ Onboarding redirect for incomplete OAuth profiles

1. Sign in with Google using an account that has no `full_name` set in Supabase.
2. **Expected**: redirect to `/onboarding?next=/dashboard`.
3. Complete the onboarding form.
4. **Expected**: redirect to `/dashboard`.

---

## 9. Common Errors & Fixes

| Error | Likely cause | Fix |
|---|---|---|
| `redirect_uri_mismatch` (Google) | Redirect URI not registered in Google Console | Add `https://<ref>.supabase.co/auth/v1/callback` to Google OAuth client |
| `invalid_grant` (Apple) | Private key or Services ID mismatch | Re-check Key ID, Team ID, Services ID, and `.p8` contents in Supabase |
| `Profile upsert failed` in server logs | `SUPABASE_SERVICE_ROLE_KEY` not set | Add the key to `.env` and restart the server |
| Stuck on `/login` after sign-in | `NEXT_PUBLIC_SUPABASE_URL` or `ANON_KEY` wrong | Verify values match Supabase Project Settings → API |
| `new row violates row-level security policy` | Code is trying to INSERT via anon client | All profile writes must go through the service-role client in `/auth/callback` |
| "Could not sign in with apple" | Apple provider not enabled in Supabase | Enable Apple provider under Authentication → Providers |
| Session expires immediately | `NEXTAUTH_SECRET` not set (legacy) | This project uses Supabase sessions only; ensure `NEXT_PUBLIC_SUPABASE_URL` and `ANON_KEY` are correct |
| Dashboard shows demo data only | No Supabase session | Sign in at `/login`; demo data is shown when `user == null` |

---

## Quick-Reference: Key Files

| File | Purpose |
|---|---|
| `src/lib/supabase.ts` | Browser Supabase client (anon key) |
| `src/lib/supabase-server.ts` | Server Supabase client (anon key + cookies) |
| `src/app/auth/callback/route.ts` | OAuth code exchange + profile upsert (service role) |
| `src/app/login/page.tsx` | Sign-in / register form (Google, Apple, email) |
| `src/app/page.tsx` | Root redirect (auth → `/dashboard`, no-auth → `/login`) |
| `src/middleware.ts` | Session validation + route protection |
| `src/app/api/profile/route.ts` | Profile read/update REST endpoint |

---

*Last updated: May 2026 · SafariCharge v0.2.3*
