# Overview

This is a Brazilian Jiu-Jitsu academy website for "Ground Up BJJ" built as a modern, full-stack web application. The site provides information about the academy, showcases coaches, and enables users to book personal training sessions with integrated Stripe payment processing. It includes a complete booking system with calendar scheduling, trainer availability management, and an admin dashboard for managing appointments.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React 18** with TypeScript for type safety and modern development
- **Vite** as the build tool for fast development and optimized production builds
- **Wouter** for client-side routing instead of React Router for lighter bundle size
- **Tailwind CSS** with shadcn/ui components for consistent, modern styling
- **TanStack Query** for server state management and API data fetching
- **React Hook Form** with Zod validation for robust form handling

## Backend Architecture
- **Express.js** server with TypeScript for API endpoints
- **Drizzle ORM** with PostgreSQL for type-safe database operations
- **Neon Database** as the serverless PostgreSQL provider
- RESTful API design with endpoints for trainers, bookings, and admin operations
- Middleware for request logging and error handling

## Authentication & Authorization
- Simple credential-based admin authentication (email/password)
- No complex session management - uses basic request validation
- Admin routes protected with middleware checking credentials

## Database Design
- **Trainers table**: Stores coach information, bios, specialties, and availability schedules
- **Bookings table**: Manages training appointments with customer details, pricing, and status
- **Admin Users table**: Stores admin credentials for dashboard access
- JSON-based availability storage for flexible scheduling

## Payment Integration
- **Stripe** integration for secure payment processing
- Stripe Checkout for hosted payment flow
- Webhook handling for payment confirmation (stub implementation)
- Support for multiple session types with different pricing

## UI Component System
- **Radix UI** primitives for accessible, headless components
- **shadcn/ui** component library for consistent design system
- Custom booking components with calendar interface
- Responsive design with mobile-first approach

## State Management
- TanStack Query for server state and API caching
- React Hook Form for form state management
- Local component state for UI interactions
- No global state management library needed

## Development Workflow
- TypeScript configuration with path mapping for clean imports
- Development server with hot module replacement
- Production builds optimized for deployment
- Database migrations handled through Drizzle Kit

# External Dependencies

## Database & Infrastructure
- **Neon Database** - Serverless PostgreSQL database hosting
- **Drizzle ORM** - Type-safe database operations and schema management

## Payment Processing
- **Stripe** - Payment processing and checkout flow
- Stripe webhooks for payment status updates

## UI & Styling
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Headless UI component primitives
- **Lucide React** - Icon library
- **Google Fonts** - Typography (Inter font family)

## Development Tools
- **Vite** - Build tool and development server
- **TypeScript** - Type checking and enhanced developer experience
- **ESBuild** - Fast JavaScript bundler for production

## Form & Validation
- **React Hook Form** - Form state management
- **Zod** - Runtime type validation and schema validation
- **Hookform Resolvers** - Integration between React Hook Form and Zod

## Date Management
- **date-fns** - Date manipulation and formatting utilities

## API & Networking
- **TanStack React Query** - Data fetching and server state management
- Native fetch API for HTTP requests