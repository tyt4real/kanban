# Kanban Board

A full-stack Kanban board application built with React, TypeScript, and Cloudflare Workers/Pages. Features include drag-and-drop task management, AI agent webhook integration, category colors, email notifications, and strong authentication.

## Features

- **Authentication**: Email/password with bcrypt (cost 12), JWT tokens in HttpOnly cookies, strong password policy (12+ chars, complexity requirements)
- **Rate Limiting**: Token bucket algorithm via Cloudflare Workers KV (configurable per endpoint)
- **Kanban Board**: 4 default columns (Todo, In Progress, Finished, Pending Review), drag-and-drop with @dnd-kit
- **Categories**: Custom categories with color picker, special "AI Agent" category
- **AI Webhook**: Triggers Hermes webhook when task enters AI Agent category (with retry logic)
- **Email Notifications**: SMTP notifications when task moves to Finished column
- **Webhook Tracking**: Delivery status monitoring with retry capability
- **Deployment**: Cloudflare Pages + Workers with D1 (SQLite) database

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| State | TanStack Query (React Query) |
| Forms | React Hook Form + Zod |
| Drag & Drop | @dnd-kit |
| Backend | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| Rate Limiting | Cloudflare Workers KV |
| Email | Nodemailer + SMTP |
| Auth | Custom JWT (jose) + bcrypt |
| CI/CD | GitHub Actions |

## Project Structure

```
kanban/
├── .github/workflows/     # CI/CD pipelines
├── public/                # Static assets
├── src/
│   ├── app/               # Cloudflare Worker backend
│   │   ├── db/            # Database schema & migrations
│   │   ├── middleware/    # Auth, rate limiting, CORS, errors
│   │   ├── routes/        # API route handlers
│   │   ├── services/      # Business logic
│   │   └── types/         # Shared TypeScript types
│   └── frontend/          # React application
│       ├── components/    # UI components
│       ├── hooks/         # Custom React hooks
│       ├── lib/           # Utilities (API client, validation)
│       ├── routes/        # Page components
│       └── styles/        # Global styles
├── tests/                 # Unit, integration, E2E tests
├── wrangler.toml          # Production Worker config
├── wrangler.dev.toml      # Development Worker config
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 22+
- Cloudflare account with D1, Pages, Workers, KV enabled
- SMTP server for email notifications
- Hermes webhook endpoint (for AI agent integration)

### Installation

```bash
# Clone and install dependencies
git clone <repo-url>
cd kanban
npm install

# Configure environment
cp wrangler.dev.toml.example wrangler.dev.toml
# Edit wrangler.dev.toml with your local D1/KV IDs

# Create local D1 database
wrangler d1 create kanban-db --local
# Update database_id in wrangler.dev.toml

# Run migrations
npm run db:migrate

# Start development servers
npm run dev
```

### Environment Variables

Configure these in Cloudflare Workers secrets (production) or `wrangler.dev.toml` (development):

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret key for JWT signing (32+ chars) |
| `HERMES_WEBHOOK_URL` | Webhook endpoint for AI agent |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (587 for TLS, 465 for SSL) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | From email address |

### Commands

```bash
# Development
npm run dev              # Start Vite + Worker dev servers
npm run dev:worker       # Worker only
npm run dev:vite         # Vite only

# Quality
npm run lint             # ESLint
npm run typecheck        # TypeScript check
npm run test             # Unit/integration tests
npm run test:e2e         # Playwright E2E tests
npm run check            # Run all quality checks
npm run format           # Prettier format

# Database
npm run db:generate      # Generate new migration
npm run db:migrate       # Apply migrations (local)
npm run db:migrate:prod  # Apply migrations (production)
npm run db:seed          # Seed development data

# Deployment
npm run deploy:preview   # Deploy preview to Cloudflare Pages
npm run deploy:prod      # Deploy to production
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

### Boards
- `GET /api/boards` - List boards
- `POST /api/boards` - Create board
- `GET /api/boards/:id` - Get board with columns
- `PATCH /api/boards/:id` - Update board
- `DELETE /api/boards/:id` - Delete board

### Columns
- `POST /api/boards/:boardId/columns` - Create column
- `PATCH /api/columns/:id` - Update column
- `DELETE /api/columns/:id` - Delete column

### Tasks
- `GET /api/boards/:boardId/tasks` - List tasks (with filters)
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/:id` - Update task
- `PATCH /api/tasks/move` - Move task between columns
- `DELETE /api/tasks/:id` - Delete task

### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `PATCH /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Webhooks
- `GET /api/webhooks/tasks/:taskId` - Get webhook delivery status
- `POST /api/webhooks/retry/:taskId` - Retry failed webhook

### Settings
- `GET /api/settings` - Get all settings
- `PUT /api/settings/smtp` - Update SMTP config
- `POST /api/settings/smtp/test` - Send test email
- `PUT /api/settings/rate-limits` - Update rate limits

## Rate Limits (Default)

| Endpoint Type | Requests/Minute |
|---------------|-----------------|
| Auth (`/api/auth/*`) | 5 |
| API (boards, tasks, etc.) | 60 |
| Webhooks | 10 |

Configure via `PUT /api/settings/rate-limits` or Cloudflare Workers secrets.

## Webhook Payload

When a task is created or moved into an AI Agent category:

```json
{
  "task": {
    "id": "uuid",
    "title": "Task title",
    "description": "Task description",
    "column_id": "uuid",
    "category_id": "uuid",
    "board_id": "uuid",
    "created_at": "ISO8601",
    "updated_at": "ISO8601"
  },
  "category": {
    "id": "uuid",
    "name": "AI Agent",
    "is_ai_agent": true
  },
  "board": { "id": "uuid", "name": "Board name" },
  "column": { "id": "uuid", "name": "In Progress" },
  "triggered_at": "ISO8601",
  "trigger_type": "created" | "moved_to_ai_category"
}
```

## Email Notification

Plain text email sent when task moves to Finished column:

```
Task "Task title" has been moved to Finished.

Board: My Project
Column: Finished
Completed at: 2024-01-15T10:30:00.000Z

Description:
Task description here

---
Kanban Board Notification
```

## Development

### Database Schema

See `src/app/db/schema.sql` for full schema. Key tables:
- `users` - Authentication
- `boards` - Kanban boards
- `columns` - Board columns
- `categories` - Task categories with colors
- `tasks` - Tasks with positions
- `webhook_deliveries` - Webhook tracking
- `settings` - Global configuration
- `rate_limit_keys` - Distributed rate limiting

### Adding Migrations

```bash
npm run db:generate
# Edit generated migration file in src/app/db/migrations/
npm run db:migrate
```

### Testing

```bash
npm run test           # Unit/integration tests (Vitest)
npm run test:e2e       # E2E tests (Playwright)
```

## Deployment

### Cloudflare Setup

1. Create D1 database: `wrangler d1 create kanban-db`
2. Create KV namespace: `wrangler kv:namespace create RATE_LIMIT_KV`
3. Update `wrangler.toml` with database_id and KV namespace IDs
4. Set secrets: `wrangler secret put JWT_SECRET` (repeat for all secrets)
5. Deploy: `npm run deploy:prod`

### GitHub Actions

Configure these secrets in GitHub repository:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## License

MIT