# Railway Deployment Guide for QRchive Backend

This backend is pre-configured and ready for deployment to [Railway](https://railway.com/). It runs a high-performance **Fastify v5** server with **PostgreSQL (Drizzle ORM)**, **Redis (BullMQ)** for background jobs, **Cloudflare R2** for photo & media storage, **Google SMTP** for verification emails, and **WebSockets** for real-time vault updates.

---

## 1. Architecture & Services Overview

To run the complete QRchive backend on Railway, your project architecture will use:
1. **Backend Web Service**: Node.js container (built with `npm run build` and started with `npm start`).
2. **PostgreSQL Database**: Railway-managed PostgreSQL plugin for relational data.
3. **Redis Service**: Railway-managed Redis instance for BullMQ background queues (`guestCreation`, `photoUpload`, and `email-delivery`).
4. **Cloudflare R2**: External object storage for photo uploads, thumbnails, and quick snaps.

---

## 2. Step-by-Step Deployment Steps

### Step 1: Push Code to GitHub
Ensure your repository is pushed to your GitHub account with the latest backend code.

### Step 2: Create a Railway Project
1. Log in to your [Railway Dashboard](https://railway.com/).
2. Click **"New Project"** -> **"Deploy from GitHub repo"**.
3. Select your repository.
4. **Important (Monorepo Setup)**:
   - Click on your newly created service.
   - Go to **Settings** -> **Service**.
   - Set **Root Directory** to `/backend`.
   - Railway will now build and run inside the `backend/` folder using [railway.json](file:///c:/Users/jevya/Desktop/qrchive/backend/railway.json).

### Step 3: Add PostgreSQL Database
1. In your Railway project canvas, click **"+ New"** -> **"Database"** -> **"Add PostgreSQL"**.
2. Railway provisions your database and exposes connection variables automatically.

### Step 4: Add Redis Service (Required for BullMQ Queues)
QRchive uses BullMQ for background photo processing, guest list batch imports, and non-blocking email delivery.
1. In your Railway canvas, click **"+ New"** -> **"Database"** -> **"Add Redis"**.
2. Railway provisions an isolated Redis cache instance.

### Step 5: Configure Environment Variables
1. Click on your **Backend Service** on the canvas and open the **Variables** tab.
2. Link the database and Redis using Railway reference variables:
   - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}`
   - `REDIS_URL`: `${{Redis.REDIS_URL}}`
3. Add the rest of the required configuration variables. You can switch to **"Raw Editor"** and paste the following template:

```env
# Server & Environment
NODE_ENV=production
LOG_LEVEL=info
DB_SSL=true

# Allowed Web Frontend Origins (comma-separated, no trailing slashes)
CORS_ORIGIN=https://your-frontend.up.railway.app,https://your-frontend.vercel.app

# Public URL of this Backend (update after generating domain in Step 7)
BACKEND_PUBLIC_URL=https://your-backend.up.railway.app

# Authentication Secrets (minimum 32 characters)
JWT_SECRET=your_super_secret_jwt_random_key_production
COOKIE_SECRET=your_super_secret_cookie_random_key_production

# Cloudflare R2 Storage
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=qrchive-2026
R2_ROOT_FOLDER=live
# Leave R2_PUBLIC_DOMAIN blank to use backend media proxying, or provide your public CDN/r2.dev URL:
R2_PUBLIC_DOMAIN=

# Google / Gmail Email Service (Nodemailer for 6-digit verification codes)
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_16_char_google_app_password

# OAuth Integrations (Optional)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=https://your-frontend.up.railway.app/login
```

> [!TIP]
> A full annotated template is available in [.env.example](file:///c:/Users/jevya/Desktop/qrchive/backend/.env.example).

### Step 6: Configure Schema Synchronization & Pre-Deploy
Drizzle ORM defines the schema in [src/db/schema.ts](file:///c:/Users/jevya/Desktop/qrchive/backend/src/db/schema.ts).
1. In your Backend Service -> **Settings** -> **Deploy**.
2. Set **Pre-Deploy Command** to:
   ```bash
   npm run db:push
   ```
   *(This ensures your PostgreSQL database schema is automatically synced and kept up to date prior to every deployment release)*.
3. Note: Auxiliary runtime tables (such as `snap_photo_likes`) and indexes are automatically verified on server startup via `initDbTables()` in [src/db/index.ts](file:///c:/Users/jevya/Desktop/qrchive/backend/src/db/index.ts).

### Step 7: Public Domain & Healthcheck Verification
1. Under **Settings** -> **Networking**, click **"Generate Domain"** to obtain your public API URL (e.g. `https://qrchive-backend-production.up.railway.app`).
2. Update the `BACKEND_PUBLIC_URL` variable in your Backend Service to match this domain.
3. Railway automatically monitors your deployment health using the configuration in [railway.json](file:///c:/Users/jevya/Desktop/qrchive/backend/railway.json):
   - **Healthcheck Path**: `/health`
   - **Timeout**: 100 seconds
4. Verify the deployment:
   - Visit `https://your-backend.up.railway.app/health` -> should return `{"status":"ok","service":"qrchive-backend"}`
   - Visit `https://your-backend.up.railway.app/reference` -> interactive Scalar API documentation

### Step 8: Connect Your Frontend
In your frontend deployment (e.g., Vercel, Netlify, or Railway UI service), configure:
- `VITE_API_BASE_URL`: `https://your-backend.up.railway.app`
- `VITE_BACKEND_URL`: `https://your-backend.up.railway.app`
- Add the frontend domain to `CORS_ORIGIN` in the backend variables!

---

## 3. Included Configurations & File Reference

| File | Purpose |
| :--- | :--- |
| **[railway.json](file:///c:/Users/jevya/Desktop/qrchive/backend/railway.json)** | Configures Nixpacks build (`npm run build`), startup (`npm start`), restart policy, and `/health` probe. |
| **[server.ts](file:///c:/Users/jevya/Desktop/qrchive/backend/src/server.ts)** | Fastify server entrypoint. Binds to `0.0.0.0:${PORT}`, configures CORS, cookies, multipart uploads (50MB), WebSockets, and graceful SIGTERM/SIGINT shutdown. |
| **[db/index.ts](file:///c:/Users/jevya/Desktop/qrchive/backend/src/db/index.ts)** | Drizzle ORM client initialization. Automatically enforces SSL for cloud database connections and creates runtime tables. |
| **[config/redis.ts](file:///c:/Users/jevya/Desktop/qrchive/backend/src/config/redis.ts)** | Redis connection manager with reconnection strategies for BullMQ and caching. |
| **[services/r2.service.ts](file:///c:/Users/jevya/Desktop/qrchive/backend/src/services/r2.service.ts)** | S3-compatible Cloudflare R2 client supporting multipart chunked uploads and fallback proxy streaming for private buckets. |
| **[services/email.service.ts](file:///c:/Users/jevya/Desktop/qrchive/backend/src/services/email.service.ts)** | Nodemailer Gmail SMTP transport for sending 6-digit HTML verification codes. |
| **[queues/email.queue.ts](file:///c:/Users/jevya/Desktop/qrchive/backend/src/queues/email.queue.ts)** | BullMQ Redis queue and worker for asynchronous email delivery with automatic retries and direct fallback. |
| **[.env.example](file:///c:/Users/jevya/Desktop/qrchive/backend/.env.example)** | Complete reference of required and optional environment variables. |

---

## 4. Common Troubleshooting Tips

> [!WARNING]
> **Redis Connection Errors / Queues Stalled**:
> If you see `[Redis Client Error]` or your photo upload worker does not process jobs, ensure you have added a Redis database service in your Railway canvas and mapped `REDIS_URL` to `${{Redis.REDIS_URL}}`.

> [!NOTE]
> **CORS Blocked on Frontend**:
> If the browser shows CORS errors when calling `/api/*`, ensure the frontend URL is added to the `CORS_ORIGIN` variable without trailing slashes (e.g. `https://qrchive.vercel.app`).

> [!NOTE]
> **Cloudflare R2 Image Display**:
> If your R2 bucket does not have a public domain or custom domain enabled, leave `R2_PUBLIC_DOMAIN` empty and ensure `BACKEND_PUBLIC_URL` points to your backend. The backend will automatically stream photos via `/api/photos/:id/file` or `/api/photos/view/:key`, preventing AWS S3 `AccessDenied` XML errors in the browser.

> [!TIP]
> **Database Seeding (Optional)**:
> If you want to seed initial event data or checklist templates into your Railway database, you can run one-off commands using the [Railway CLI](https://docs.railway.com/guides/cli):
> ```bash
> railway run npm run db:seed:events
> railway run npm run db:seed:checklist
> ```
