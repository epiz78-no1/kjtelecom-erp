# SKT 광케이블 자재 관리 시스템

## Overview

This is an enterprise material management system for SKT telecommunications fiber optic cable installation projects. The application enables business divisions and field teams to track inventory, record incoming/outgoing materials, and monitor usage statistics across construction sites.

Key capabilities:
- Multi-division inventory tracking with real-time stock levels
- Incoming and outgoing material record management
- Field team material allocation and usage tracking
- Usage statistics and reporting dashboards
- Dark/light theme support with Korean language interface

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React Context for app-wide state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Charts**: Recharts for data visualization

### Backend Architecture
- **Runtime**: Node.js with Express
- **API Style**: RESTful JSON API under `/api/*` routes
- **Build Tool**: Vite for development, esbuild for production bundling
- **TypeScript**: Shared types between client and server via `@shared/*` path alias

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Defined in `shared/schema.ts` with Zod validation via drizzle-zod
- **Migrations**: Managed via `drizzle-kit push` command

### Project Structure
```
client/src/          # React frontend
  components/        # Reusable UI components
  components/ui/     # shadcn/ui primitives
  pages/             # Route page components
  contexts/          # React context providers
  hooks/             # Custom React hooks
  lib/               # Utilities and query client
server/              # Express backend
  routes.ts          # API route definitions
  storage.ts         # Data access layer
  db.ts              # Database connection
shared/              # Shared types and schema
  schema.ts          # Drizzle schema + Zod validators
```

### Design System
- Enterprise data management aesthetic inspired by Ant Design/Material Design
- Korean web fonts (Noto Sans KR) with professional typography scale
- Responsive grid layouts optimized for data tables and dashboards
- Mobile-responsive for field team tablet/mobile access

## External Dependencies

### Database
- **PostgreSQL**: Primary data store via `DATABASE_URL` environment variable
- **Connection**: pg Pool with Drizzle ORM wrapper

### Third-Party Services
- Google Fonts CDN for Noto Sans KR typography

### Key NPM Dependencies
- `drizzle-orm` + `drizzle-zod`: Database ORM and schema validation
- `@tanstack/react-query`: Server state management
- `@radix-ui/*`: Accessible UI primitives
- `recharts`: Chart components for statistics
- `date-fns`: Date formatting utilities
- `wouter`: Client-side routing
- `express`: HTTP server framework