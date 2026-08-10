# Chhatradol Social Welfare Organization (ছাত্রদল সমাজকল্যাণ সংস্থা)

A full‑stack web platform for **Chhatradol Social Welfare Organization**, a public
charitable trust based in Nij Narajole, Daspur, Paschim Medinipur, West Bengal.

It combines a public marketing/awareness website with a secure **member portal**
and **admin portal**, including online donations through **Razorpay**.

Built with **React + Vite + TypeScript + Tailwind CSS** on the front end and
**Supabase** (Postgres, Auth, Row‑Level Security, Edge Functions) on the back end.

---

## Features

### Public website (Bengali)

- Home, About, Programs, Events/News, Gallery, Impacts, Contact, Volunteer, Donate
- 35+ historical activity posts + member‑submitted posts (after admin approval)
- Contact form and volunteer application form (stored in the database)
- Online donations via Razorpay (one‑off, anonymous allowed), every donation tracked

### Member portal (`/member`)

- **Login only** — there is no public self‑signup. An admin must create/approve the
  account before a member can log in.
- Dashboard with personal stats
- Edit profile + change password
- **Manage posts** — create/edit/delete; posts go live after admin approval
- **Attendance** — mark which events / camps you attended or volunteered at
- **Monthly contributions** — see which months are paid/unpaid and pay online (Razorpay)
- **Donation history**

### Admin portal (`/admin`)

- Dashboard with Organization‑wide stats
- **Member management** — create member/admin accounts, approve / suspend / reject,
  change roles, remove
- **Post moderation** — approve, publish, reject, edit, delete, create
- **Events & camps** — full CRUD
- **Attendance** — mark attendance for any member per event
- **Monthly contributions** — set dues, record cash payments, track per member
- **Donation records** — full ledger of who donated
- **Messages & applications** — contact messages and volunteer applications

---

## Tech & architecture

| Layer     | Choice                                                                 |
| --------- | ---------------------------------------------------------------------- |
| Front end | React 18, Vite 5, TypeScript, Tailwind CSS, React Router 6             |
| Auth / DB | Supabase (Postgres + GoTrue auth + RLS)                                |
| Payments  | Razorpay (orders + signature verification in a Supabase Edge Function) |

All Organization tables are prefixed `cswo_` so they coexist safely with anything
else in the Supabase project. Row‑Level Security is enabled on every table; a
`SECURITY DEFINER` helper (`cswo_is_admin()`) is used to avoid policy recursion.

### Database tables

`cswo_members`, `cswo_posts`, `cswo_events`, `cswo_attendance`, `cswo_donations`,
`cswo_monthly_contributions`, `cswo_volunteer_applications`, `cswo_contact_messages`.

The full schema lives in [`supabase/migrations/`](./supabase/migrations).

### Edge Functions

- `cswo-admin-create-member` — admin‑only, creates an approved auth user + member row.
- `cswo-razorpay` — creates Razorpay orders and verifies payment signatures for both
  donations and monthly contributions.

---

## Local development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build to dist/
```

### Environment variables (`.env`)

```
VITE_SUPABASE_URL=...             # your Supabase project URL
VITE_SUPABASE_ANON_KEY=...        # publishable / anon key (safe in the browser)
VITE_RAZORPAY_KEY_ID=rzp_test_xxx # Razorpay key_id only (public)
```

The committed `.env` already points at the connected Supabase project. The
Razorpay **key_secret must never** be placed in `.env` — it is set only as a
Supabase Edge Function secret (see below).

---

## Enabling Razorpay payments

1. In the [Razorpay dashboard](https://dashboard.razorpay.com/) get your **test**
   `key_id` and `key_secret`.
2. Put the **key_id** in `.env` as `VITE_RAZORPAY_KEY_ID` (then rebuild/redeploy the front end).
3. Set the secrets for the Edge Function (Supabase Dashboard → Edge Functions →
   `cswo-razorpay` → Secrets, or the CLI):
   ```bash
   supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxx RAZORPAY_KEY_SECRET=xxx
   ```
   Until these are set, the donate/contribution flows show a friendly
   "payment gateway not configured" message and nothing is charged.

---

## Deployment

The project builds to a static `dist/` folder (`netlify.toml` is included for
Netlify; any static host works). Set the same `VITE_*` env vars in your host's
build settings.
