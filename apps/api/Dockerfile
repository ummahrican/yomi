# Build context must be the REPO ROOT so the pnpm workspace (incl. the shared
# package) is available:  docker build -f apps/api/Dockerfile -t daily-alt-api .
FROM node:22-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy the whole monorepo (the API runs via tsx, so no compile step is needed).
COPY . .

RUN pnpm install --frozen-lockfile

ENV NODE_ENV=production
EXPOSE 3000

# Run migrations + seed, then start the server (which also runs the ingest cron).
CMD ["pnpm", "--filter", "@daily-alt/api", "run", "migrate-and-start"]
