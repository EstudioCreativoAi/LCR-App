# Los Cabos Long-Term Rental Marketplace (LCR)

A premium, role-based marketplace designed specifically for long-term rentals in Los Cabos, Mexico. This platform connects Renters, Landlords, and Agents with a streamlined flow for property discovery, verification, and digital leasing.

---

## 🚀 Tech Stack

- **Frontend**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/) (Cross-platform Web & Mobile)
- **Backend & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Real-time, Authentication)
- **Payments**: [Stripe](https://stripe.com/) (Secure rent collection and deposits)
- **E-Signatures**: [DocuSign](https://www.docusign.com/) (Legalized lease agreements)
- **Styling**: Native StyleSheet with modern design tokens

---

## 🛠️ Features

- **Role-Based Access**: Specialized dashboards for Renters, Landlords, and Agents.
- **Premium Property Feed**: High-performance listing view with photo carousels and advanced filtering (Price, Bed/Bath, Move-in Date).
- **Demo Mode**: Built-in authentication bypass for rapid visual testing.
- **Baja-Tech UI**: A clean, responsive design optimized for both desktop and mobile views.

---

## ⚙️ Environment Setup

To run this project locally, you will need to set up your environment variables.

1. Create a `.env` file in the root directory.
2. Add the following Supabase credentials (found in your Supabase Project Settings):

```bash
EXPO_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

3. (Upcoming) Add Stripe and DocuSign keys for Phase 3 integration:
```bash
STRIPE_PUBLISHABLE_KEY=pk_test_...
DOCUSIGN_INTEGRATION_KEY=...
```

---

## 📜 Project Logic & Roadmap

This project follows the **PRD Version 1.0** specifications for core marketplace logic.

- **Phase 1**: Database Schema & Security Policies (Completed)
- **Phase 2**: Authentication & Role Management (Completed)
- **Phase 3**: Property Management & Digital Signing (In Progress)
- **Phase 4**: Automated Rent Collection (Upcoming)

---

## ☁️ Vercel Deployment

### Environment Variables (Production & Preview)

Configure environment variables in the [Vercel Dashboard](https://vercel.com/dashboard) (Project Settings → Environment Variables):

| Variable | Production (main) | Preview (staging) |
|----------|-------------------|-------------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Main Supabase project URL | Staging Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Main Supabase anon key | Staging Supabase anon key |

- **Production** — Used for deployments from `main`. Map to your primary Supabase project.
- **Preview** — Used for deployments from feature branches. Map to your secondary Staging Supabase project.

Add each variable and scope it to **Production** or **Preview** (or both) as appropriate.

### Syncing Environment Variables Locally

Use `vercel env pull` to sync the correct keys into `.env.local` based on which environment you need:

```bash
# Link the project first (one-time)
vercel link

# Pull Production keys (main Supabase) — use when on main or testing production
vercel env pull .env.local --environment=production

# Pull Preview keys (Staging Supabase) — use when on feature branches or testing staging
vercel env pull .env.local --environment=preview
```

**Branch-based workflow:**
- Working on `main` → `vercel env pull .env.local --environment=production` (or `npm run vercel:env:production`)
- Working on a feature branch → `vercel env pull .env.local --environment=preview` (or `npm run vercel:env:preview`)

Expo loads `.env.local` in addition to `.env`; the pulled file overrides values for local development.

---

## 📦 Getting Started

```bash
# Install dependencies
npm install

# Start the development server (Web)
npx expo start --web
```

---

## 🛡️ License
Private - Proprietary and confidential. Developed for the Los Cabos Rental Marketplace MVP.
