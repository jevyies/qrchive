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

const activeSection = ref('introduction')
const sections = [
    { id: 'introduction', label: 'Introduction' },
    { id: 'data-collected', label: 'Data We Collect' },
    { id: 'how-we-use', label: 'How We Use It' },
    { id: 'data-sharing', label: 'Data Sharing' },
    { id: 'storage', label: 'Storage & Security' },
    { id: 'cookies', label: 'Cookies & Tokens' },
    { id: 'your-rights', label: 'Your Rights' },
    { id: 'children', label: "Children's Privacy" },
    { id: 'changes', label: 'Policy Changes' },
    { id: 'contact', label: 'Contact Us' },
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
                    <button class="icon-btn" @click="toggleTheme"
                        :title="isDarkMode ? 'Switch to Light' : 'Switch to Dark'">
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
                    <span class="material-symbols-outlined">privacy_tip</span>
                    <span>Legal Document</span>
                </div>
                <h1 class="policy-hero-title">Privacy Policy</h1>
                <p class="policy-hero-sub">How QRchive collects, uses, stores, and protects your personal information.
                </p>
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

                <section id="introduction" class="policy-section">
                    <h2 class="section-heading">
                        <span class="material-symbols-outlined section-icon">info</span>Introduction
                    </h2>
                    <p>QRchive Events ("QRchive," "we," "us," or "our") operates the QRchive platform — a celebration
                        memory vault that allows event organisers ("Owners") and their guests ("Snap Guests") to
                        capture, share, and archive photos and short video clips at weddings and milestone events.</p>
                    <p>This Privacy Policy explains what personal information we collect, how we use it, who we share it
                        with, and what rights you have. By accessing or using QRchive, you agree to the practices
                        described in this Policy.</p>
                    <div class="policy-callout">
                        <span class="material-symbols-outlined">shield</span>
                        <span>QRchive is built with a <strong>privacy-first approach</strong>. We collect only what is
                            necessary to deliver our service and never sell personal data to third parties.</span>
                    </div>
                </section>

                <section id="data-collected" class="policy-section">
                    <h2 class="section-heading">
                        <span class="material-symbols-outlined section-icon">database</span>Data We Collect
                    </h2>
                    <h3 class="sub-heading">A. Account Owners &amp; Administrators</h3>
                    <div class="data-table-wrap">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Category</th>
                                    <th>Examples</th>
                                    <th>Purpose</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Identity</td>
                                    <td>First name, last name, middle name, suffix</td>
                                    <td>Account personalisation &amp; display</td>
                                </tr>
                                <tr>
                                    <td>Contact</td>
                                    <td>Email address</td>
                                    <td>Account creation, OTP verification, notifications</td>
                                </tr>
                                <tr>
                                    <td>Credentials</td>
                                    <td>Hashed password (bcrypt), OAuth tokens (Google / GitHub)</td>
                                    <td>Authentication &amp; access control</td>
                                </tr>
                                <tr>
                                    <td>Avatar</td>
                                    <td>Profile picture URL (from OAuth provider)</td>
                                    <td>UI display only</td>
                                </tr>
                                <tr>
                                    <td>Session</td>
                                    <td>JWT access tokens (5-min TTL), refresh tokens (1–90 day TTL)</td>
                                    <td>Secure session management</td>
                                </tr>
                                <tr>
                                    <td>Role &amp; Status</td>
                                    <td>authPosition (admin / owner / ordinary)</td>
                                    <td>Role-based access control (RBAC)</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <h3 class="sub-heading">B. Event Data</h3>
                    <div class="data-table-wrap">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Category</th>
                                    <th>Examples</th>
                                    <th>Purpose</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Event Details</td>
                                    <td>Event name, bride/groom names, event date, guest cap, price tier</td>
                                    <td>Event creation &amp; management</td>
                                </tr>
                                <tr>
                                    <td>Guest List</td>
                                    <td>Guest first/last name, table assignment, RSVP status</td>
                                    <td>Invitation management &amp; seating</td>
                                </tr>
                                <tr>
                                    <td>Event Token</td>
                                    <td>Unique random URL token per event</td>
                                    <td>Generates shareable QR code link</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <h3 class="sub-heading">C. Snap Guests (No Account Required)</h3>
                    <div class="data-table-wrap">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Category</th>
                                    <th>Examples</th>
                                    <th>Purpose</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Display Name</td>
                                    <td>Guest-entered nickname at QR scan</td>
                                    <td>Photo attribution &amp; gallery display</td>
                                </tr>
                                <tr>
                                    <td>Device Identifier</td>
                                    <td>Random serial stored in browser localStorage</td>
                                    <td>Prevents duplicate sessions; not linked to hardware</td>
                                </tr>
                                <tr>
                                    <td>Guest Code</td>
                                    <td>Unique short code per snap session</td>
                                    <td>Session continuity for re-scans</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <h3 class="sub-heading">D. Media Uploads</h3>
                    <ul class="policy-list">
                        <li>The media file itself (Cloudflare R2 object storage)</li>
                        <li>File metadata: filename, MIME type, file size, storage key, upload status</li>
                        <li>Uploader attribution linked to snap guest display name and session</li>
                        <li>Checklist item association (if a photo scavenger hunt is active)</li>
                        <li>Like interactions identified by device/session string — not a user account</li>
                    </ul>

                    <h3 class="sub-heading">E. Technical &amp; Diagnostic Data</h3>
                    <ul class="policy-list">
                        <li>Server-side request logs (IP address, request path, HTTP status) — debugging only</li>
                        <li>Browser-stored preferences: theme choice, last-visited event token (localStorage)</li>
                    </ul>
                </section>

                <section id="how-we-use" class="policy-section">
                    <h2 class="section-heading">
                        <span class="material-symbols-outlined section-icon">manage_accounts</span>How We Use Your Data
                    </h2>
                    <ul class="policy-list">
                        <li><strong>Service delivery</strong> — Creating events, processing photo uploads, generating QR
                            codes and printable placards.</li>
                        <li><strong>Authentication &amp; security</strong> — Verifying identity via email OTP or OAuth;
                            issuing and rotating JWT &amp; refresh tokens; RBAC enforcement.</li>
                        <li><strong>Communication</strong> — Sending email verification codes via Google SMTP. We do not
                            send marketing emails without explicit consent.</li>
                        <li><strong>Background processing</strong> — Photo resize, batch upload queuing (BullMQ /
                            Redis), and async guest creation run server-side only.</li>
                        <li><strong>Real-time features</strong> — WebSocket streams new photo uploads live to the event
                            vault. No persistent personal data flows over WebSocket beyond event-scoped metadata.</li>
                        <li><strong>Analytics &amp; improvement</strong> — Aggregate, anonymised counts (total events,
                            photos, guests) in the admin stats panel. No individual tracking profiles are built.</li>
                    </ul>
                </section>

                <section id="data-sharing" class="policy-section">
                    <h2 class="section-heading">
                        <span class="material-symbols-outlined section-icon">share</span>Data Sharing &amp; Third
                        Parties
                    </h2>
                    <p>We do <strong>not sell</strong> personal data. We share data only with the following
                        sub-processors:</p>
                    <div class="data-table-wrap">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Provider</th>
                                    <th>Purpose</th>
                                    <th>Data Transferred</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Cloudflare R2</td>
                                    <td>Object storage for media files</td>
                                    <td>Photo/video files, storage keys</td>
                                </tr>
                                <tr>
                                    <td>Cloudflare Image Resizing</td>
                                    <td>On-the-fly thumbnail generation</td>
                                    <td>Image file (processed transiently)</td>
                                </tr>
                                <tr>
                                    <td>Railway</td>
                                    <td>Backend hosting, managed PostgreSQL &amp; Redis</td>
                                    <td>All server-side data (encrypted at rest)</td>
                                </tr>
                                <tr>
                                    <td>Google SMTP</td>
                                    <td>Transactional email (OTP verification)</td>
                                    <td>Recipient email address, OTP code</td>
                                </tr>
                                <tr>
                                    <td>Google OAuth</td>
                                    <td>Optional login via Google account</td>
                                    <td>Google profile ID, name, avatar URL, email</td>
                                </tr>
                                <tr>
                                    <td>GitHub OAuth</td>
                                    <td>Optional login via GitHub account</td>
                                    <td>GitHub user ID, email (if public)</td>
                                </tr>
                                <tr>
                                    <td>Google Fonts</td>
                                    <td>Typography rendering</td>
                                    <td>Browser IP (standard CDN request)</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p>After the event, Owners can download all media directly through QRchive's built-in export feature — a system-generated dedicated download link allows bulk download of all event photos without any third-party integration required.</p>
                </section>

                <section id="storage" class="policy-section">
                    <h2 class="section-heading">
                        <span class="material-symbols-outlined section-icon">cloud</span>Storage &amp; Security
                    </h2>
                    <div class="policy-callout callout-gold">
                        <span class="material-symbols-outlined">lock</span>
                        <span>All data is encrypted in transit (TLS 1.3) and at rest on Railway's managed PostgreSQL and
                            Cloudflare R2.</span>
                    </div>
                    <h3 class="sub-heading">Retention Periods</h3>
                    <div class="data-table-wrap">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Data Type</th>
                                    <th>Retention</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Account data (name, email, hashed password)</td>
                                    <td>Until account deletion is requested</td>
                                </tr>
                                <tr>
                                    <td>Event &amp; guest data</td>
                                    <td>Until event owner deletes the event (cascade delete)</td>
                                </tr>
                                <tr>
                                    <td>Media files (photos/videos)</td>
                                    <td>2 months post-event (extendable at +₱200/month)</td>
                                </tr>
                                <tr>
                                    <td>Email verification OTPs</td>
                                    <td>Until expiry (minutes)</td>
                                </tr>
                                <tr>
                                    <td>Refresh tokens</td>
                                    <td>1 day (standard) or 90 days (remember-me); revoked on logout</td>
                                </tr>
                                <tr>
                                    <td>Server logs</td>
                                    <td>Rolling 7-day window; not archived</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <h3 class="sub-heading">Security Measures</h3>
                    <ul class="policy-list">
                        <li>Passwords hashed with <strong>bcrypt</strong> (industry-standard salted hashing)</li>
                        <li>JWT access tokens expire after <strong>5 minutes</strong>; refresh tokens are single-use
                            HttpOnly cookies</li>
                        <li>CORS restricts API access to explicitly listed frontend origins</li>
                        <li>File upload limits: 50 MB per file/chunk, 10 MB per text field</li>
                    </ul>
                </section>

                <section id="cookies" class="policy-section">
                    <h2 class="section-heading">
                        <span class="material-symbols-outlined section-icon">cookie</span>Cookies &amp; Local Storage
                    </h2>
                    <div class="data-table-wrap">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Storage</th>
                                    <th>Key</th>
                                    <th>Purpose</th>
                                    <th>Expiry</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>HttpOnly Cookie</td>
                                    <td><code>refreshToken</code></td>
                                    <td>Persistent session</td>
                                    <td>1 or 90 days</td>
                                </tr>
                                <tr>
                                    <td>localStorage</td>
                                    <td><code>jui_theme</code></td>
                                    <td>Preferred colour theme</td>
                                    <td>Persistent</td>
                                </tr>
                                <tr>
                                    <td>localStorage</td>
                                    <td><code>jui_theme_bg</code></td>
                                    <td>Background colour cache (anti-FOUC)</td>
                                    <td>Persistent</td>
                                </tr>
                                <tr>
                                    <td>localStorage</td>
                                    <td><code>qrchive_device_serial</code></td>
                                    <td>Anonymous device ID for snap sessions</td>
                                    <td>Persistent + 1-year cookie fallback</td>
                                </tr>
                                <tr>
                                    <td>localStorage</td>
                                    <td><code>qrchive_guest_name</code></td>
                                    <td>Snap guest display name</td>
                                    <td>Persistent</td>
                                </tr>
                                <tr>
                                    <td>localStorage</td>
                                    <td><code>currentEvent</code></td>
                                    <td>Active event session for guests</td>
                                    <td>Persistent</td>
                                </tr>
                                <tr>
                                    <td>localStorage</td>
                                    <td><code>qrchive_user</code></td>
                                    <td>Cached authenticated user profile</td>
                                    <td>Cleared on logout</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p>We do not use any third-party tracking cookies or advertising pixels. You can clear localStorage
                        and cookies at any time through your browser settings.</p>
                </section>

                <section id="your-rights" class="policy-section">
                    <h2 class="section-heading">
                        <span class="material-symbols-outlined section-icon">gavel</span>Your Rights
                    </h2>
                    <ul class="policy-list">
                        <li><strong>Access</strong> — Request a copy of personal data we hold about you.</li>
                        <li><strong>Rectification</strong> — Request correction of inaccurate or incomplete data.</li>
                        <li><strong>Erasure</strong> — Request deletion of your account and associated data.</li>
                        <li><strong>Portability</strong> — Request an export of your event data and media.</li>
                        <li><strong>Objection</strong> — Object to processing of your data for certain purposes.</li>
                        <li><strong>Withdrawal of consent</strong> — Withdraw consent at any time where processing is
                            consent-based.</li>
                    </ul>
                    <p>To exercise any of these rights, contact us at <a class="policy-link"
                            href="mailto:privacy@qrchive.app">privacy@qrchive.app</a>. We will respond within 30
                        calendar days.</p>
                </section>

                <section id="children" class="policy-section">
                    <h2 class="section-heading">
                        <span class="material-symbols-outlined section-icon">child_care</span>Children's Privacy
                    </h2>
                    <p>QRchive is intended for use by adults (18+) and is not directed at children under 13. We do not
                        knowingly collect personal information from children. If you believe a child has provided us
                        with personal data, contact us immediately and we will delete it promptly.</p>
                    <p>At milestone events where minors may appear in photos uploaded by adult guests, those photos are
                        stored solely within the private event vault accessible only to the event owner and authorised
                        staff.</p>
                </section>

                <section id="changes" class="policy-section">
                    <h2 class="section-heading">
                        <span class="material-symbols-outlined section-icon">update</span>Policy Changes
                    </h2>
                    <p>We may update this Privacy Policy from time to time. When we do, we will update the "Last
                        updated" date at the top of this page. If changes are material, we will notify registered
                        account owners via email at least 14 days before the effective date.</p>
                    <p>Continued use of QRchive after the effective date constitutes acceptance of the revised Policy.
                    </p>
                </section>

                <section id="contact" class="policy-section">
                    <h2 class="section-heading">
                        <span class="material-symbols-outlined section-icon">contact_mail</span>Contact Us
                    </h2>
                    <p>If you have any questions about this Privacy Policy or the handling of your personal data, please
                        contact us:</p>
                    <div class="contact-card">
                        <div class="contact-row">
                            <span class="material-symbols-outlined">mail</span>
                            <div>
                                <div class="contact-label">Privacy Enquiries</div>
                                <a class="policy-link" href="mailto:privacy@qrchive.app">privacy@qrchive.app</a>
                            </div>
                        </div>
                        <div class="contact-row">
                            <span class="material-symbols-outlined">business</span>
                            <div>
                                <div class="contact-label">Legal Entity</div>
                                <span>QRchive Atelier Inc.</span>
                            </div>
                        </div>
                    </div>
                </section>

                <div class="policy-footer-links">
                    <a class="policy-link" @click.prevent="router.push('/terms-of-service')">Terms of Service</a>
                    <span class="text-accent">•</span>
                    <a class="policy-link" @click.prevent="router.push('/security-standards')">Security Standards</a>
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
}

.data-table tr:nth-child(even) td {
    background: var(--table-row-alt);
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
