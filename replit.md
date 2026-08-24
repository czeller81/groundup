# Overview

Ground Up Jiu-Jitsu & Fitness — a boutique BJJ and fitness academy in Oxnard, CA focused on women, kids, and beginners. Offers small group classes (max 6 students), women's self-defense, BJJ fundamentals, kids jiu-jitsu, strength & conditioning, and personal training. Brand positioning: empowering, safe, community-driven, premium but approachable. Includes a complete member portal with authentication, intake forms, session booking, and a comprehensive admin + coach management system.

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
- RESTful API endpoints for trainers, bookings, portal auth, contact, admin, coach, session notes

## Member Portal
- Email/password auth with bcrypt password hashing
- Session-based authentication via cookies
- Role-based access control: admin, coach, member
- Required intake forms: Personal Training Intake, Health/PAR-Q, Goals & Preferences
- Auto-save every 2 seconds on forms
- Members can view their submitted form answers from the dashboard
- Booking system: sessions 8am–5pm, auto-selected trainer (Raymi Gonzalez)
- Same-day cancellations allowed with $10 fee warning

## Admin Dashboard (/portal/admin)
- Stats cards: Total Users, New Users (30d), Active Memberships, Upcoming Sessions (7d), Monthly Revenue
- Member list with search and pagination (15 per page)
- Full member profiles with tabbed interface: Forms, Bookings, Session Notes, Admin Settings
- Role management (admin/coach/member), belt rank, attendance count
- Admin internal notes per member
- Session notes CRUD (visible to admin and coach)
- Form response viewer with detailed answers

## Coach Center (/portal/coach)
- View assigned members (members with assignedCoachId matching coach's userId)
- Add session notes for members
- Update belt rank and attendance count
- Admins see all members in coach view

## Calendly Integration
- Webhook endpoint: POST /webhook/calendly
- Supports native Calendly invitee.created events
- Auto-creates users by email if they don't exist
- Creates bookings with default trainer

## Database Tables
- users: id, email, passwordHash, firstName, lastName, phone, role (admin/coach/member), beltRank, attendanceCount, assignedCoachId, adminNotes, createdAt
- memberships: id, userId, type, status, priceCents, startDate, endDate, createdAt
- session_notes: id, userId, coachId, notes, sessionDate, createdAt
- bookings: id, userId, trainerId, customerName/Email/Phone, sessionType, start, end, status, amountCents, currency, stripeSessionId, calendlyEventId, paymentStatus, notes, createdAt
- trainers: id, name, bio, photoUrl, specialties, beltRank, availability
- forms: id, slug, title, description, fields, isRequired
- form_responses: id, userId, formId, answers, status, submittedAt, updatedAt, createdAt
- admin_users: legacy admin auth table

## Admin Credentials
- admin@groundupbjj.com (role=admin in users table)

## Payment Integration
- **Stripe** integration (configured via integration)

## Pages
- Home (single-page with Hero, Trust strip, Programs, Coach, Testimonials, Pricing, FAQ, CTA)
- Personal Training (info + CTA to portal)
- Coaches (Raymi Gonzalez spotlight)
- Programs (Start Here funnel — no pricing shown)
- Contact (form + info)
- Portal: Login, Dashboard, Forms, Booking, Admin, Coach

## PWA (Progressive Web App)
- Installable on iPhone/Android via "Add to Home Screen"
- manifest.json at client/public/manifest.json
- Icons at client/public/icons/ (192x192, 512x512, 180x180 apple-touch-icon)
- Apple meta tags in client/index.html (apple-mobile-web-app-capable, theme-color, status-bar-style)
- App name: "Ground Up BJJ", display: standalone, theme: #0B0F14

## Business Info
- Phone: (786) 757-1175
- Email: info@groundupbjj.com
- Location: Oxnard, CA
- Trainer: Raymi Gonzalez, Purple Belt 3rd Degree
- Sessions: 8am–5pm

# External Dependencies
- Neon Database (PostgreSQL)
- Stripe (payment processing)
- Tailwind CSS + Radix UI + shadcn/ui
- Framer Motion (animations)
- Lucide React + react-icons (icons)
- Google Fonts (Inter + Oswald)
- date-fns (date utilities)
