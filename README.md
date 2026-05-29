# CatSystemWeb3 Backend

## Requirements

- Node.js
- pnpm
- PostgreSQL

## Setup

```bash
pnpm install
```

Copy `.env.example` to `.env` and fill in the values.

## Database

```bash
pnpm migrate
```

To rollback:
```bash
pnpm migrate:rollback
```

## Run

```bash
# development
pnpm dev

# production
pnpm start
```
