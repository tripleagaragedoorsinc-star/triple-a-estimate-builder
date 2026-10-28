# Triple A Smart Estimate Builder

Internal garage-door installation estimate and supplier-ordering application for Triple A Garage Doors.

## Stack

- React 19 + TypeScript + Vite
- Supabase (existing project `dclsuavrlnaclpvkbrck`) for auth, database, and RLS
- Responsive design for desktop, iPhone, and iPad

## Database connection

The app is configured to connect to the existing Supabase project `dclsuavrlnaclpvkbrck` using its public URL and publishable key (in `.env`). If the project is not reachable from the current environment, the app runs in demo mode with typed sample data — no replacement infrastructure is created.

## Roles

- **Owner** — Full access: supplier costs, margins, pricing settings, user management, reports
- **Admin** — Manage staff, estimates, and workflows. No supplier-cost access
- **Sales** — Create and manage estimates using approved selling prices only

## Pricing engine

- Adjusted Supplier Cost = Supplier Unit Cost x 1.10
- Standard Material Selling Price = Adjusted Supplier Cost x 2.20
- Maximum material discount: 20%
- Labor: $550–$1,000 per door (by complexity)
- Disposal: $150 first door, $100 each additional, $50 per old opener
- Tax: 6.25% Massachusetts default, configurable per line item
- Owner override with reason and audit log

## Features

- Multi-door estimate builder with opener selection
- Product catalog (doors, openers, materials) with search and filter
- Supplier ordering checklist with component classification (Included / Order Separately / Needs Verification / Verified)
- Owner pricebook with supplier costs and pricing benchmarks
- User management with role assignment and activation control
- Copy to ServiceTitan export
- Print/PDF output
- Password recovery

## Development

```bash
npm install
npm run dev
npm run build
npm run typecheck
```
