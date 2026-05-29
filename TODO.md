# TODO

## Setup

- [ ] Copy `.env.sample` to `.env` and fill in all values
- [ ] Add `src/idl/cat_system.json` — run `anchor build` in your program repo and copy from `target/idl/your_program.json`, or fetch with:
  ```bash
  anchor idl fetch <PROGRAM_ID> --provider.cluster mainnet > src/idl/cat_system.json
  ```

## Database

- [ ] Run migrations once DB is ready: `pnpm migrate`

## Listener

- [ ] In `src/listeners/programListener.js`, implement `handleEvent()` to persist decoded events to the DB

## Deployment

- [ ] Use a private RPC endpoint (Helius, QuickNode, etc.) — public endpoints rate-limit WebSocket connections
