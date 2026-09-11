# Kanban Board

A Kanban board application built with TypeScript and Cloudflare Pages. Features include drag-and-drop task management, AI agent webhook integration, category colors, email notifications, and strong authentication.

## Features

- **Authentication**: Email/password with bcrypt (cost 12), JWT tokens in HttpOnly cookies, strong password policy (12+ chars, complexity requirements)
- **Rate Limiting**: Token bucket algorithm via Cloudflare Workers KV (configurable per endpoint)
- **Kanban Board**: 4 default columns (Todo, In Progress, Finished, Pending Review), drag-and-drop with @dnd-kit
- **Categories**: Custom categories with color picker, special "AI Agent" category
- **AI Webhook**: Triggers Hermes webhook when task enters AI Agent category (with retry logic)
- **Email Notifications**: SMTP notifications when task moves to Finished column
- **Webhook Tracking**: Delivery status monitoring with retry capability
- **Deployment**: Cloudflare Pages + Workers with D1 (SQLite) database

## Getting Started

### Prerequisites

- Node.js 22+
- Cloudflare account with D1, Pages, Workers, KV enabled
- SMTP server for email notifications
- Hermes webhook endpoint (for AI agent integration)

### Installation

```bash
# Clone and install dependencies
git clone https://github.com/tyt4real/kanban
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

### Adding Migrations

```bash
npm run db:generate
# Edit generated migration file in src/app/db/migrations/
npm run db:migrate
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
