# Overview

Ground Up Women's BJJ — a premium, modern website for a females-only personal training gym in Oxnard, CA. Features 1-on-1 jiu-jitsu and strength & conditioning training for female athletes. Includes a complete member portal with authentication, intake forms, and session booking.

# User Preferences

Preferred communication style: Simple, everyday language.

# Design System — "Midnight Neon"

## Color Palette
- Base dark: `#0B0F14` (hsl 220 20% 7%), `#121826` (hsl 222 30% 10%)
- Primary (cyan neon): `#5EEBFF` (hsl 189 100% 68%)
- Secondary (purple neon): `#B06CFF` (hsl 266 100% 71%)
- Warm CTA: `#FFB199` (hsl 15 100% 80%)
- Text: light gray on dark backgrounds

## Typography
- Display/headings: **Oswald** (bold, condensed, uppercase, tracking-wide)
- Body: **Inter** (clean sans-serif)
- Headings use `font-family: var(--font-display)` inline style

## Visual Motifs
- Grain texture overlay (`.grain-texture`)
- Diagonal belt-stripe lines (`.belt-stripe`)
- Neon glow effects (`.neon-glow`, `.neon-glow-purple`)
- Gradient text utilities (`.gradient-text-cyan`, `.gradient-text-purple`, `.gradient-text-warm`)
- Soft blur orbs for ambient lighting

## Animations
- **Framer Motion** for scroll-reveal sections, hero entrance, hover micro-interactions
- Section wrapper component using `useInView` for scroll-triggered animation
- FAQ accordion with animated height transitions

# System Architecture

## Frontend Architecture
- **React 18** with TypeScript
- **Vite** build tool
- **Wouter** for client-side routing
- **Tailwind CSS** + **shadcn/ui** components
- **Framer Motion** for animations
- **TanStack Query** for server state
- **React Hook Form** + **Zod** for forms

## Backend Architecture
- **Express.js** with TypeScript
- **Drizzle ORM** + PostgreSQL (Neon)
- RESTful API endpoints for trainers, bookings, portal auth, contact

## Member Portal
- Email/password auth with bcrypt password hashing
- Session-based authentication via cookies
- Required intake forms: Personal Training Intake, Health/PAR-Q, Goals & Preferences
- Auto-save every 2 seconds on forms
- Members can view their submitted form answers from the dashboard
- Booking system: sessions 8am–5pm, auto-selected trainer (Raymi Gonzalez)
- Same-day cancellations allowed with $10 fee warning
- Admin members page (/portal/admin): search members, view full profiles with forms & bookings
- Admin credentials: admin@groundupbjj.com (role=admin in users table)

## Payment Integration
- **Stripe** integration (configured via integration)

## Pages
- Home (single-page with Hero, Trust strip, Programs, Coach, Testimonials, Pricing, FAQ, CTA)
- Personal Training (info + CTA to portal)
- Coaches (Raymi Gonzalez spotlight)
- Pricing (per-session $20 + monthly unlimited $280)
- Contact (form + info)
- Portal: Login, Dashboard, Forms, Booking

## Business Info
- Phone: (786) 757-1175
- Email: raymin33@gmail.com
- Location: Oxnard, CA
- Trainer: Raymi Gonzalez, Purple Belt 3rd Degree
- Sessions: $20/hour, 8am–5pm

# External Dependencies
- Neon Database (PostgreSQL)
- Stripe (payment processing)
- Tailwind CSS + Radix UI + shadcn/ui
- Framer Motion (animations)
- Lucide React + react-icons (icons)
- Google Fonts (Inter + Oswald)
- date-fns (date utilities)
