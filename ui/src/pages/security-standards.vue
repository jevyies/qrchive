<route lang="yaml">
meta:
  layout: blank
  public: true
</route>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLayout } from '../composables/useLayout'
import AppLogo from '../@core/components/AppLogo.vue'

const router = useRouter()
const { currentTheme, selectTheme, isDarkMode } = useLayout()
const toggleTheme = () => selectTheme(isDarkMode.value ? 'light' : 'dark')

const activeSection = ref('overview')
const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'auth', label: 'Authentication' },
  { id: 'transport', label: 'Transport Security' },
  { id: 'storage', label: 'Data Storage' },
  { id: 'media', label: 'Media & File Security' },
  { id: 'api', label: 'API & Network Security' },
  { id: 'session', label: 'Session Management' },
  { id: 'access-control', label: 'Access Control (RBAC)' },
  { id: 'background', label: 'Background Services' },
  { id: 'reporting', label: 'Vulnerability Reporting' },
]

const scrollTo = (id) => {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

let observer
onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => entries.forEach(e => { if (e.isIntersecting) activeSection.value = e.target.id }),
    { rootMargin: '-20% 0px -70% 0px' }
  )
  sections.forEach(s => { const el = document.getElementById(s.id); if (el) observer.observe(el) })
})
onUnmounted(() => observer?.disconnect())
</script>

<template>
  <div class="policy-page font-sans" :data-theme="currentTheme" :class="['policy-page--' + currentTheme]">

    <header class="policy-header">
      <div class="policy-header-inner">
        <a class="brand-link" @click.prevent="router.push('/')">
          <AppLogo :width="34" :height="34" color="primary" />
          <div class="brand-text">
            <span class="brand-title">QRchive Events</span>
            <span class="brand-subtitle">Celebration Vault</span>
          </div>
        </a>
        <div class="header-actions">
          <button class="icon-btn" @click="toggleTheme" :title="isDarkMode ? 'Switch to Light' : 'Switch to Dark'">
            <span class="material-symbols-outlined">{{ isDarkMode ? 'light_mode' : 'dark_mode' }}</span>
          </button>
          <button class="back-btn" @click="router.push('/')">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>Back to Home</span>
          </button>
        </div>
      </div>
    </header>

    <div class="policy-hero">
      <div class="policy-hero-glow"></div>
      <div class="policy-hero-inner">
        <div class="policy-badge">
          <span class="material-symbols-outlined">security</span>
          <span>Technical Document</span>
        </div>
        <h1 class="policy-hero-title">Security Standards</h1>
        <p class="policy-hero-sub">A transparent overview of the security architecture, controls, and practices that
          protect your celebrations.</p>
        <p class="policy-last-updated">
          <span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle">schedule</span>
          Last updated: September 28, 2026
        </p>
      </div>
    </div>

    <div class="policy-content-wrapper">
      <aside class="policy-toc">
        <p class="toc-heading">On This Page</p>
        <nav>
          <a v-for="s in sections" :key="s.id" class="toc-link" :class="{ active: activeSection === s.id }"
            @click.prevent="scrollTo(s.id)">{{ s.label }}</a>
        </nav>
      </aside>

      <article class="policy-body">

        <section id="overview" class="policy-section">
          <h2 class="section-heading">
            <span class="material-symbols-outlined section-icon">shield</span>Overview
          </h2>
          <p>QRchive is committed to safeguarding the personal data and precious memories entrusted to us by event
            owners and their guests. This document provides a transparent, technical overview of the security controls
            embedded throughout our platform — from authentication and transport encryption to media storage and API
            protection.</p>
          <div class="security-grid">
            <div class="security-stat-card">
              <span class="material-symbols-outlined stat-icon">lock</span>
              <div class="stat-label">Transport Encryption</div>
              <div class="stat-value">TLS 1.3</div>
            </div>
            <div class="security-stat-card">
              <span class="material-symbols-outlined stat-icon">token</span>
              <div class="stat-label">Access Token TTL</div>
              <div class="stat-value">5 Minutes</div>
            </div>
            <div class="security-stat-card">
              <span class="material-symbols-outlined stat-icon">key</span>
              <div class="stat-label">Password Hashing</div>
              <div class="stat-value">bcrypt</div>
            </div>
            <div class="security-stat-card">
              <span class="material-symbols-outlined stat-icon">storage</span>
              <div class="stat-label">File Storage</div>
              <div class="stat-value">Cloudflare R2</div>
            </div>
          </div>
        </section>

        <section id="auth" class="policy-section">
          <h2 class="section-heading">
            <span class="material-symbols-outlined section-icon">passkey</span>Authentication
          </h2>

          <h3 class="sub-heading">Password Security</h3>
          <ul class="policy-list">
            <li>All passwords are hashed using <strong>bcrypt</strong> with an industry-standard salt factor before
              storage. Plaintext passwords are never stored or logged anywhere in the system.</li>
            <li>Password fields are never returned in API responses; the <code>password</code> column is explicitly
              excluded from all user query results sent to clients.</li>
          </ul>

          <h3 class="sub-heading">Email Verification (OTP)</h3>
          <ul class="policy-list">
            <li>New local accounts require email verification via a <strong>one-time passcode (OTP)</strong> before
              gaining full platform access.</li>
            <li>OTPs are cryptographically random short codes stored in the <code>email_verifications</code> table with
              a strict expiry timestamp. Expired OTPs are rejected and purged.</li>
            <li>OTPs are transmitted only via TLS-encrypted Google SMTP and are never exposed in API responses.</li>
          </ul>

          <h3 class="sub-heading">OAuth 2.0 (Google &amp; GitHub)</h3>
          <ul class="policy-list">
            <li>QRchive supports optional OAuth login via Google and GitHub. Authentication is delegated entirely to the
              OAuth provider; we receive only a provider-issued identity token and minimal profile data (ID, name,
              email, avatar).</li>
            <li>OAuth tokens from providers are never persisted. Only the provider-issued <code>googleId</code> or
              <code>githubId</code> (opaque identifiers) are stored for account linking.
            </li>
          </ul>

          <h3 class="sub-heading">Snap Guest Authentication (QR-Scan Flow)</h3>
          <ul class="policy-list">
            <li>Snap Guests (event photo uploaders) do not require a platform account. They access the event vault via a
              unique per-event URL token.</li>
            <li>Guest identity is tracked via a randomly generated <code>deviceSerial</code> stored in browser
              localStorage and optionally a 1-year cookie fallback — not linked to real-world hardware identifiers.</li>
            <li>A unique <code>guestCode</code> is issued per snap session for session continuity across re-scans.</li>
          </ul>
        </section>

        <section id="transport" class="policy-section">
          <h2 class="section-heading">
            <span class="material-symbols-outlined section-icon">encrypted</span>Transport Security
          </h2>
          <div class="policy-callout callout-gold">
            <span class="material-symbols-outlined">lock</span>
            <span>All communication between clients and the QRchive backend is encrypted in transit using <strong>TLS
                1.3</strong>. Plain HTTP is not supported in production.</span>
          </div>
          <ul class="policy-list">
            <li>The backend is deployed on <strong>Railway</strong> with HTTPS enforced at the infrastructure layer.
            </li>
            <li>The frontend (UI) is served over HTTPS via Vercel or Railway static hosting.</li>
            <li>Cloudflare R2 media assets are served over HTTPS, with Cloudflare's global CDN providing DDoS protection
              and edge caching.</li>
            <li>WebSocket connections for live photo streaming are established over <strong>WSS (WebSocket
                Secure)</strong>.</li>
            <li>Google SMTP is used for transactional email delivery over TLS-secured SMTP connections (port 465/587).
            </li>
          </ul>
        </section>

        <section id="storage" class="policy-section">
          <h2 class="section-heading">
            <span class="material-symbols-outlined section-icon">database</span>Data Storage
          </h2>

          <h3 class="sub-heading">Primary Database (PostgreSQL on Railway)</h3>
          <ul class="policy-list">
            <li>QRchive uses a managed <strong>PostgreSQL</strong> database hosted on Railway with encryption at rest
              enabled.</li>
            <li>Database connections use SSL (<code>DB_SSL=true</code>), enforcing encrypted connections between the
              backend application and the database server.</li>
            <li>The database is not publicly accessible; only the backend application server can connect via internal
              networking.</li>
            <li>Database credentials are stored as environment variables and never committed to source code.</li>
          </ul>

          <h3 class="sub-heading">Cache &amp; Background Queues (Redis on Railway)</h3>
          <ul class="policy-list">
            <li>A managed <strong>Redis</strong> instance on Railway is used for BullMQ task queues (photo processing,
              email delivery, guest creation) and is not used for persistent user data.</li>
            <li>Redis is not publicly accessible; only the backend application can connect via internal networking.</li>
          </ul>

          <h3 class="sub-heading">Secret &amp; Credential Management</h3>
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Secret</th>
                  <th class="text-center">Storage</th>
                  <th class="text-center">Rotation Recommendation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>JWT Secret</td>
                  <td>Railway environment variable</td>
                  <td>Rotate on suspected compromise</td>
                </tr>
                <tr>
                  <td>Cookie Signing Secret</td>
                  <td>Railway environment variable</td>
                  <td>Rotate on suspected compromise</td>
                </tr>
                <tr>
                  <td>Database URL</td>
                  <td>Railway environment variable (managed)</td>
                  <td>Managed by Railway</td>
                </tr>
                <tr>
                  <td>R2 Access Key / Secret</td>
                  <td>Railway environment variable</td>
                  <td>Rotate quarterly</td>
                </tr>
                <tr>
                  <td>Gmail App Password</td>
                  <td>Railway environment variable</td>
                  <td>Rotate if account is compromised</td>
                </tr>
                <tr>
                  <td>OAuth Client Secrets</td>
                  <td>Railway environment variable</td>
                  <td>Rotate if exposed</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="media" class="policy-section">
          <h2 class="section-heading">
            <span class="material-symbols-outlined section-icon">photo_library</span>Media &amp; File Security
          </h2>
          <ul class="policy-list">
            <li>All photos and videos uploaded by guests are stored in <strong>Cloudflare R2</strong> object storage,
              encrypted at rest.</li>
            <li>Files are stored under a structured key path (<code>live/{eventId}/{guestId}/{fileName}</code>) within
              the R2 bucket. Direct bucket access requires valid Cloudflare R2 credentials.</li>
            <li>When a custom public domain (<code>R2_PUBLIC_DOMAIN</code>) is not configured, media is served through a
              backend proxy endpoint that enforces authentication and event-scoping before returning any media.</li>
            <li>Cloudflare Image Resizing is used for thumbnail generation; it processes images transiently and does not
              retain a copy separate from the R2 bucket.</li>
            <li>Upload file size limits are enforced server-side: <strong>50 MB per file/chunk</strong>, <strong>10 MB
                per text field</strong>. Requests exceeding these limits are rejected with HTTP 413.</li>
            <li>MIME type and file extension are recorded at upload time. The system detects video files (MP4, WebM) and
              images separately for appropriate thumbnail handling.</li>
            <li>On event deletion, all associated R2 storage keys are deleted as part of the cascade operation. QRchive
              does not retain orphaned media files.</li>
          </ul>
        </section>

        <section id="api" class="policy-section">
          <h2 class="section-heading">
            <span class="material-symbols-outlined section-icon">api</span>API &amp; Network Security
          </h2>

          <h3 class="sub-heading">CORS Policy</h3>
          <p>Cross-Origin Resource Sharing (CORS) is configured to allow requests only from explicitly listed frontend
            origins, defined via the <code>CORS_ORIGIN</code> environment variable. Wildcard origins (<code>*</code>)
            are never used in production. Allowed methods: <code>GET, POST, PUT, PATCH, DELETE, OPTIONS</code>.</p>

          <h3 class="sub-heading">Error Handling &amp; Information Leakage</h3>
          <ul class="policy-list">
            <li>A global Fastify error handler intercepts all unhandled errors. For HTTP 500 errors, it returns only a
              generic <code>{"message": "Server Error"}</code> response — no stack traces, file paths, or internal
              details are exposed to clients.</li>
            <li>For client errors (4xx), descriptive but non-sensitive error messages are returned to help the user
              understand the problem without revealing system internals.</li>
          </ul>

          <h3 class="sub-heading">Input Validation</h3>
          <ul class="policy-list">
            <li>All API endpoints are defined with JSON Schema validation via Fastify's built-in AJV (Another JSON
              Validator). Requests that fail schema validation are rejected before reaching route handlers.</li>
            <li>Database queries use <strong>Drizzle ORM</strong> with parameterised queries, providing inherent
              protection against SQL injection.</li>
          </ul>

          <h3 class="sub-heading">Rate Limiting</h3>
          <p>Rate limiting is enforced at the infrastructure layer via Railway and Cloudflare. Application-level rate
            limiting for sensitive endpoints (login, OTP verification) is planned for a future release.</p>
        </section>

        <section id="session" class="policy-section">
          <h2 class="section-heading">
            <span class="material-symbols-outlined section-icon">manage_accounts</span>Session Management
          </h2>
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Token Type</th>
                  <th class="text-center">Storage</th>
                  <th class="text-center">TTL</th>
                  <th class="text-center">Security Properties</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>JWT Access Token</td>
                  <td>Client memory / <code>Authorization</code> header</td>
                  <td>5 minutes</td>
                  <td>Short-lived; signed with HS256 using JWT_SECRET; contains user ID, email, role, status</td>
                </tr>
                <tr>
                  <td>Refresh Token (standard)</td>
                  <td>HttpOnly cookie</td>
                  <td>1 day</td>
                  <td>Cryptographically random 80-char hex; single-use; stored hashed in DB; invalidated on logout</td>
                </tr>
                <tr>
                  <td>Refresh Token (remember-me)</td>
                  <td>HttpOnly cookie</td>
                  <td>90 days</td>
                  <td>Same as above; extended lifetime for persistent sessions</td>
                </tr>
              </tbody>
            </table>
          </div>
          <ul class="policy-list">
            <li>Refresh tokens are stored as <strong>HttpOnly cookies</strong>, making them inaccessible to JavaScript
              and mitigating XSS-based token theft.</li>
            <li>Refresh tokens are stored in the <code>refresh_tokens</code> database table with expiry timestamps. On
              rotation, the old token is revoked (<code>revokedAt</code> is set) before a new one is issued.</li>
            <li>On logout, the refresh token is immediately revoked in the database.</li>
            <li>The cookie is signed using <code>COOKIE_SECRET</code> (minimum 32-character random string) for tamper
              detection.</li>
            <li>Access tokens contain the user's <code>authPosition</code> and <code>status</code>, which are checked on
              every protected route to enforce RBAC and block banned/pending users.</li>
          </ul>
        </section>

        <section id="access-control" class="policy-section">
          <h2 class="section-heading">
            <span class="material-symbols-outlined section-icon">admin_panel_settings</span>Access Control (RBAC)
          </h2>
          <p>QRchive implements role-based access control enforced both at the API layer and in the frontend router.</p>
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Route / Resource</th>
                  <th class="text-center">Admin</th>
                  <th class="text-center">Owner</th>
                  <th class="text-center">Ordinary</th>
                  <th class="text-center">Snap Guest</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Dashboard</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✗</td>
                </tr>
                <tr>
                  <td>Stores management</td>
                  <td>✓</td>
                  <td>✗</td>
                  <td>✗</td>
                  <td>✗</td>
                </tr>
                <tr>
                  <td>User management</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✗</td>
                  <td>✗</td>
                </tr>
                <tr>
                  <td>Event creation &amp; management</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✗</td>
                  <td>✗</td>
                </tr>
                <tr>
                  <td>Guest list &amp; tables</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✗</td>
                </tr>
                <tr>
                  <td>Photo gallery (event vault)</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>Upload only</td>
                </tr>
                <tr>
                  <td>Settings &amp; system config</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✗</td>
                  <td>✗</td>
                </tr>
                <tr>
                  <td>Stats &amp; analytics</td>
                  <td>✓</td>
                  <td>✗</td>
                  <td>✗</td>
                  <td>✗</td>
                </tr>
              </tbody>
            </table>
          </div>
          <ul class="policy-list">
            <li>The <code>authenticate</code> middleware verifies the JWT on every protected API route, checking both
              token validity and the embedded <code>authPosition</code>.</li>
            <li>The <code>optionalAuthenticate</code> middleware is used on public event vault routes (e.g., photo
              upload) — they work without an account but may have additional checks for event ownership.</li>
            <li>Owner accounts in <code>pending</code> status can only access the dashboard; all other routes redirect
              to the dashboard until an administrator activates the account.</li>
            <li>Frontend route guards (<code>router.beforeEach</code>) mirror the backend RBAC rules, preventing
              unauthorised navigation even before an API call is made.</li>
          </ul>
        </section>

        <section id="background" class="policy-section">
          <h2 class="section-heading">
            <span class="material-symbols-outlined section-icon">settings_suggest</span>Background Services
          </h2>
          <p>QRchive uses <strong>BullMQ</strong> (backed by Redis) for processing tasks asynchronously without blocking
            the main request thread. Three background workers are active:</p>
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Worker</th>
                  <th class="text-center">Purpose</th>
                  <th class="text-center">Security Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>photoUploadWorker</td>
                  <td>Processes chunked photo uploads and assembles files for R2 storage</td>
                  <td>Operates server-side only; temporary chunks are deleted after successful assembly</td>
                </tr>
                <tr>
                  <td>emailWorker</td>
                  <td>Sends OTP verification emails via Google SMTP</td>
                  <td>Email content is sanitised; credentials are env-variable-only; no email body logging in production
                  </td>
                </tr>
                <tr>
                  <td>guestCreationWorker</td>
                  <td>Async batch creation of Snap Guest records</td>
                  <td>Validates event existence before guest creation; rejects orphaned guest records</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>All workers perform graceful shutdown on <code>SIGTERM</code> / <code>SIGINT</code> signals, ensuring
            in-flight tasks are completed cleanly without data loss before the process exits.</p>
        </section>

        <section id="reporting" class="policy-section">
          <h2 class="section-heading">
            <span class="material-symbols-outlined section-icon">bug_report</span>Vulnerability Reporting
          </h2>
          <p>We take security vulnerabilities seriously. If you discover a potential security issue in QRchive, we ask
            that you:</p>
          <ul class="policy-list">
            <li><strong>Do not</strong> publicly disclose the vulnerability before it has been addressed.</li>
            <li>Email us at <a class="policy-link" href="mailto:security@qrchive.app">security@qrchive.app</a> with a
              clear description of the issue, steps to reproduce, potential impact, and any proof-of-concept if
              available.</li>
            <li>Allow us a reasonable timeframe (typically 30–90 days) to investigate and remediate before any public
              disclosure.</li>
          </ul>
          <div class="policy-callout callout-gold">
            <span class="material-symbols-outlined">handshake</span>
            <span>We deeply appreciate responsible security researchers who help us keep QRchive safe. We will
              acknowledge your contribution in our security advisories (with your permission).</span>
          </div>
          <div class="contact-card">
            <div class="contact-row">
              <span class="material-symbols-outlined">security</span>
              <div>
                <div class="contact-label">Security Reports</div>
                <a class="policy-link" href="mailto:security@qrchive.app">security@qrchive.app</a>
              </div>
            </div>
            <div class="contact-row">
              <span class="material-symbols-outlined">business</span>
              <div>
                <div class="contact-label">Organisation</div>
                <span>QRchive Atelier Inc.</span>
              </div>
            </div>
          </div>
        </section>

        <div class="policy-footer-links">
          <a class="policy-link" @click.prevent="router.push('/privacy-policy')">Privacy Policy</a>
          <span class="text-accent">•</span>
          <a class="policy-link" @click.prevent="router.push('/terms-of-service')">Terms of Service</a>
          <span class="text-accent">•</span>
          <a class="policy-link" @click.prevent="router.push('/')">Back to QRchive</a>
        </div>

      </article>
    </div>
  </div>
</template>

<style scoped>
.policy-page {
  font-family: 'Outfit', sans-serif;
  min-height: 100vh;
  background: var(--bg-body, #fff8f5);
  color: var(--text-body, #2d1e0f);
  transition: background 0.3s, color 0.3s;
}

.policy-page--dark {
  --bg-body: #161311;
  --text-body: #f5ede3;
  --text-muted: #a89880;
  --surface: #1e1814;
  --border: rgba(215, 180, 101, 0.15);
  --callout-bg: rgba(215, 180, 101, 0.07);
  --callout-border: rgba(215, 180, 101, 0.25);
  --table-header: rgba(215, 180, 101, 0.12);
  --table-row-alt: rgba(255, 255, 255, 0.03);
  --toc-active: #d7b465;
  --toc-hover: rgba(215, 180, 101, 0.1);
}

.policy-page--light {
  --bg-body: #fff8f5;
  --text-body: #2d1e0f;
  --text-muted: #7a5c40;
  --surface: #fef4ed;
  --border: rgba(139, 90, 43, 0.15);
  --callout-bg: rgba(215, 180, 101, 0.08);
  --callout-border: rgba(139, 90, 43, 0.2);
  --table-header: rgba(215, 180, 101, 0.15);
  --table-row-alt: rgba(0, 0, 0, 0.02);
  --toc-active: #b8892e;
  --toc-hover: rgba(215, 180, 101, 0.12);
}

.policy-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: color-mix(in srgb, var(--bg-body) 85%, transparent);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border);
}

.policy-header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.brand-title {
  font-size: 0.95rem;
  font-weight: 700;
}

.brand-subtitle {
  font-size: 0.65rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.icon-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  width: 36px;
  height: 36px;
  cursor: pointer;
  color: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: var(--callout-bg);
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: none;
  cursor: pointer;
  color: inherit;
  font-size: 0.8rem;
  font-weight: 500;
  font-family: inherit;
  transition: all 0.2s;
}

.back-btn:hover {
  background: var(--callout-bg);
}

.back-btn .material-symbols-outlined {
  font-size: 16px;
}

.policy-hero {
  position: relative;
  overflow: hidden;
  padding: 4rem 1.5rem 3rem;
  text-align: center;
}

.policy-hero-glow {
  position: absolute;
  top: -80px;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 300px;
  background: radial-gradient(ellipse, rgba(215, 180, 101, 0.18) 0%, transparent 70%);
  pointer-events: none;
}

.policy-hero-inner {
  position: relative;
  max-width: 700px;
  margin: 0 auto;
}

.policy-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.9rem;
  border-radius: 100px;
  background: var(--callout-bg);
  border: 1px solid var(--callout-border);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--toc-active);
  margin-bottom: 1.25rem;
}

.policy-badge .material-symbols-outlined {
  font-size: 15px;
}

.policy-hero-title {
  font-family: 'Playfair Display', serif;
  font-size: clamp(2rem, 5vw, 3.25rem);
  font-weight: 600;
  line-height: 1.1;
  margin: 0 0 1rem;
  background: linear-gradient(135deg, var(--text-body) 0%, var(--toc-active) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.policy-hero-sub {
  font-size: 1.05rem;
  color: var(--text-muted);
  line-height: 1.7;
  margin-bottom: 1rem;
}

.policy-last-updated {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.policy-content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem 5rem;
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 3rem;
  align-items: start;
}

@media (max-width: 900px) {
  .policy-content-wrapper {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .policy-toc {
    display: none;
  }
}

.policy-toc {
  position: sticky;
  top: 80px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 1.25rem;
}

.toc-heading {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin: 0 0 0.75rem;
}

.toc-link {
  display: block;
  padding: 0.45rem 0.6rem;
  border-radius: 0 7px 7px 0;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text-muted);
  text-decoration: none;
  cursor: pointer;
  transition: all 0.18s;
  border-left: 2px solid transparent;
  margin-bottom: 2px;
}

.toc-link:hover {
  background: var(--toc-hover);
  color: var(--text-body);
}

.toc-link.active {
  background: var(--toc-hover);
  color: var(--toc-active);
  border-left-color: var(--toc-active);
  font-weight: 600;
}

.policy-body {
  min-width: 0;
}

.policy-section {
  margin-bottom: 3.5rem;
  scroll-margin-top: 90px;
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-family: 'Playfair Display', serif;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
}

.section-icon {
  font-size: 20px;
  color: var(--toc-active);
}

.sub-heading {
  font-size: 1rem;
  font-weight: 600;
  margin: 1.5rem 0 0.75rem;
  color: var(--toc-active);
}

p {
  line-height: 1.8;
  color: var(--text-body);
  margin: 0 0 1rem;
}

code {
  background: var(--table-header);
  padding: 0.15em 0.45em;
  border-radius: 4px;
  font-size: 0.82em;
  font-family: 'JetBrains Mono', monospace;
}

.policy-list {
  padding-left: 1.5rem;
  margin: 0 0 1rem;
}

.policy-list li {
  line-height: 1.8;
  margin-bottom: 0.4rem;
  color: var(--text-body);
}

.policy-callout {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-radius: 10px;
  background: var(--callout-bg);
  border: 1px solid var(--callout-border);
  margin: 1.25rem 0;
  font-size: 0.92rem;
  line-height: 1.7;
}

.policy-callout .material-symbols-outlined {
  font-size: 20px;
  color: var(--toc-active);
  flex-shrink: 0;
  margin-top: 1px;
}

.callout-gold {
  border-color: rgba(215, 180, 101, 0.4);
}

.data-table-wrap {
  overflow-x: auto;
  margin: 1rem 0;
  border-radius: 10px;
  border: 1px solid var(--border);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.data-table th {
  background: var(--table-header);
  padding: 0.7rem 1rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  text-transform: uppercase;
}

.data-table td {
  padding: 0.65rem 1rem;
  border-top: 1px solid var(--border);
  line-height: 1.6;
  text-align: center;
}

.data-table td:first-child {
  text-align: left;
}

.data-table tr:nth-child(even) td {
  background: var(--table-row-alt);
}

/* Security stat cards */
.security-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  margin: 1.5rem 0;
}

.security-stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.25rem 1rem;
  text-align: center;
  transition: border-color 0.2s;
}

.security-stat-card:hover {
  border-color: var(--toc-active);
}

.stat-icon {
  font-size: 28px;
  color: var(--toc-active);
  display: block;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 0.3rem;
}

.stat-value {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-body);
}

.contact-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-top: 1rem;
}

.contact-row {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
}

.contact-row .material-symbols-outlined {
  font-size: 20px;
  color: var(--toc-active);
  margin-top: 2px;
}

.contact-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 0.2rem;
}

.policy-link {
  color: var(--toc-active);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.policy-link:hover {
  opacity: 0.8;
}

.policy-footer-links {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  padding-top: 2.5rem;
  border-top: 1px solid var(--border);
  font-size: 0.85rem;
  margin-top: 1rem;
}

.text-accent {
  color: #d7b465;
}
</style>
