Run the AI worker (requires a Redis instance reachable via REDIS_URL or REDIS_HOST/REDIS_PORT):

Development (with tsx):

```powershell
# Start API server (in one terminal)
npm run dev

# Start worker (in another terminal)
npm run dev:worker
```

Production:
- Build the project: npm run build
- Run the API: npm run start
- Run the compiled worker: node dist/worker.js

Environment variables:
- REDIS_URL (optional) or REDIS_HOST and REDIS_PORT
- PORT_BACKEND to adjust API port

Notes:
- Jobs are enqueued with names: detect-anomalies, generate-insights, generate-predictions, generate-recommendations
- The worker invokes functions in `src/ai.ts` and writes results to the DB via Prisma.
