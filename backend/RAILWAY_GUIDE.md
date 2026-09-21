# Railway Deployment Guide for QRchive Backend

This backend is pre-configured and ready for deployment to [Railway](https://railway.com/).

---

## 1. Quick Deploy Steps

### Step 1: Push Code to GitHub
Ensure this repository is pushed to your GitHub account.

### Step 2: Create a Railway Project
1. Log in to [Railway](https://railway.com/).
2. Click **"New Project"**.
3. Select **"Deploy from GitHub repo"** and choose your repository.
4. If your repository has both `backend` and `ui` folders in the same repo, configure **Root Directory** in Railway Service Settings to `/backend`.

### Step 3: Add PostgreSQL Database
1. In your Railway project canvas, click **"+ New"** -> **"Database"** -> **"Add PostgreSQL"**.
2. Railway will provision a managed PostgreSQL database.

### Step 4: Link Database to Backend
1. Click on your backend service on the Railway canvas.
2. Navigate to the **Variables** tab.
3. Click **"New Variable"** -> **"Add Reference"** (or type `DATABASE_URL`).
4. Select `${{Postgres.DATABASE_URL}}`.
5. Add the following additional variables:
   - `NODE_ENV`: `production`
   - `CORS_ORIGIN`: `https://your-frontend.up.railway.app,http://localhost:5173` (or leave empty to allow all)

### Step 5: Database Migrations
Migrations are stored in `./drizzle/` and pre-generated.
In Railway:
1. Go to your Backend Service -> **Settings** -> **Deploy**.
2. Set **Pre-Deploy Command** to:
   ```bash
   npm run db:migrate
   ```
   *(Alternatively, you can run `npm run db:push` if you prefer direct schema syncing)*.

### Step 6: Public Domain & Healthcheck
1. Under **Settings** -> **Networking**, click **"Generate Domain"** to get your public API URL (e.g. `https://xxx.up.railway.app`).
2. Verify Railway uses the healthcheck endpoint:
   - **Healthcheck Path**: `/health` (defined in `railway.json`).

---

## 2. Included Configurations

- **[railway.json](file:///c:/Users/jevya/Desktop/wedding-drive/backend/railway.json)**: Configures Nixpacks build (`npm run build`), startup command (`npm start`), restart policy, and healthcheck path (`/health`).
- **[server.ts](file:///c:/Users/jevya/Desktop/wedding-drive/backend/src/server.ts)**:
  - Binds to `0.0.0.0` (mandatory for container environments).
  - Listens on `process.env.PORT` dynamically assigned by Railway.
  - Registers `@fastify/cors` for frontend communication.
  - Implements graceful shutdown (`SIGTERM`, `SIGINT`) to cleanly terminate database connections during redeployments.
- **[db/index.ts](file:///c:/Users/jevya/Desktop/wedding-drive/backend/src/db/index.ts)**:
  - Auto-detects cloud/SSL requirements for production connection strings.
  - Exports `client` and `db` with relational queries enabled.
- **[.env.example](file:///c:/Users/jevya/Desktop/wedding-drive/backend/.env.example)**: Reference for all required and optional environment variables.
