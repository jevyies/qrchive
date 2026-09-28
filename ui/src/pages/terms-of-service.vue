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

const activeSection = ref('agreement')
const sections = [
  { id: 'agreement', label: 'Agreement to Terms' },
  { id: 'service', label: 'Description of Service' },
  { id: 'accounts', label: 'Accounts & Access' },
  { id: 'acceptable', label: 'Acceptable Use' },
  { id: 'content', label: 'User Content & IP' },
  { id: 'payments', label: 'Payments & Packages' },
  { id: 'storage', label: 'Storage & Expiry' },
  { id: 'termination', label: 'Termination' },
  { id: 'liability', label: 'Limitation of Liability' },
  { id: 'changes', label: 'Changes to Terms' },
  { id: 'contact', label: 'Contact' },
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
          <span class="material-symbols-outlined">description</span>
          <span>Legal Document</span>
        </div>
        <h1 class="policy-hero-title">Terms of Service</h1>
        <p class="policy-hero-sub">The rules and agreement governing your use of QRchive's celebration vault platform.
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

        <section id="agreement" class="policy-section">
          <h2 class="section-heading">
            <span class="material-symbols-outlined section-icon">handshake</span>Agreement to Terms
          </h2>
          <p>These Terms of Service ("Terms") form a legally binding agreement between you and QRchive Atelier Inc.
            ("QRchive," "we," "us," or "our") governing your access to and use of the QRchive platform, including its
            web application, APIs, and any associated services (collectively, the "Service").</p>
          <p>By registering an account, scanning a QR code to access an event vault, or otherwise using the Service, you
            confirm that you have read, understood, and agree to be bound by these Terms. If you do not agree, you must
            immediately cease use of the Service.</p>
          <div class="policy-callout">
            <span class="material-symbols-outlined">info</span>
            <span>These Terms apply to all users of QRchive: <strong>Administrators</strong> (platform staff),
              <strong>Owners</strong> (event organisers who create events), and <strong>Snap Guests</strong> (guests who
              scan QR codes to upload photos).</span>
          </div>
        </section>

        <section id="service" class="policy-section">
          <h2 class="section-heading">
            <span class="material-symbols-outlined section-icon">photo_camera</span>Description of Service
          </h2>
          <p>QRchive is a web-based celebration memory vault designed for weddings and milestone events. The Service
            enables:</p>
          <ul class="policy-list">
            <li><strong>Event creation</strong> — Owners can create events specifying bride/groom names, event date,
              guest capacity, and pricing tier.</li>
            <li><strong>QR code generation</strong> — Each event receives a unique token-based URL that can be printed
              on table placards for guests to scan.</li>
            <li><strong>Photo &amp; video capture</strong> — Snap Guests can upload uncompressed photos and short video
              clips (up to 30 seconds) directly from their mobile browsers without installing an app.</li>
            <li><strong>Photo Scavenger Hunt</strong> — Owners can define a checklist of moments for guests to capture,
              gamifying the experience.</li>
            <li><strong>Live event vault</strong> — A real-time gallery of uploaded media, accessible to the event owner
              and authorised staff via WebSocket streaming.</li>
            <li><strong>Export &amp; archive</strong> — After the event, owners can download a full ZIP archive
              via QRchive's built-in dedicated download link — no third-party integrations required.</li>
            <li><strong>Printable placards</strong> — Automatically generated 5×7 table placards with QR code in chic
              gold styling for display at events.</li>
          </ul>
          <p>QRchive reserves the right to modify, suspend, or discontinue any feature of the Service at any time with
            reasonable notice.</p>
        </section>

        <section id="accounts" class="policy-section">
          <h2 class="section-heading">
            <span class="material-symbols-outlined section-icon">manage_accounts</span>Accounts &amp; Access
          </h2>
          <h3 class="sub-heading">Account Registration</h3>
          <ul class="policy-list">
            <li>You must provide accurate and complete information when registering. Providing false information is a
              breach of these Terms.</li>
            <li>You must be at least 18 years of age to create an account.</li>
            <li>One account per person; you may not share accounts or create accounts on behalf of others without
              authorisation.</li>
            <li>You are responsible for maintaining the confidentiality of your password and for all activity that
              occurs under your account.</li>
          </ul>
          <h3 class="sub-heading">Authentication Methods</h3>
          <p>QRchive supports local email/password login, Google OAuth, and GitHub OAuth. For local accounts, email
            verification via OTP is required before full access is granted. For OAuth accounts, your identity is
            verified through the respective OAuth provider.</p>
          <h3 class="sub-heading">Account Roles</h3>
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Permissions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Admin</strong></td>
                  <td>Full platform access: stores, users, events, settings, stats</td>
                </tr>
                <tr>
                  <td><strong>Owner</strong></td>
                  <td>Create and manage events, view guests, export media, access dashboard</td>
                </tr>
                <tr>
                  <td><strong>Ordinary</strong></td>
                  <td>View guests, tables, pictures for assigned events</td>
                </tr>
                <tr>
                  <td><strong>Snap Guest</strong></td>
                  <td>Scan QR, upload photos/videos, interact with scavenger hunt (no account required)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <h3 class="sub-heading">Owner Account Activation</h3>
          <p>Newly registered Owner accounts begin in <code>pending</code> status. In pending status, access is
            restricted to the dashboard only. An Administrator must activate your account before you can create or
            manage events.</p>
        </section>

        <section id="acceptable" class="policy-section">
          <h2 class="section-heading">
            <span class="material-symbols-outlined section-icon">rule</span>Acceptable Use
          </h2>
          <p>You agree to use QRchive only for lawful purposes and in a manner consistent with the spirit of a
            celebration memory vault. The following are strictly prohibited:</p>
          <ul class="policy-list">
            <li>Uploading content that is illegal, obscene, defamatory, threatening, harassing, or that violates any
              third-party rights.</li>
            <li>Uploading content that depicts nudity, sexual activity, or graphic violence.</li>
            <li>Uploading malware, viruses, or any code designed to damage, interfere with, or gain unauthorised access
              to any system.</li>
            <li>Attempting to circumvent upload limits, guest caps, or payment requirements through technical means.
            </li>
            <li>Scraping, crawling, or systematically downloading event media without the event owner's explicit
              consent.</li>
            <li>Using the Service to infringe copyright, trademark, or other intellectual property rights of third
              parties.</li>
            <li>Impersonating another person or falsely representing your affiliation with any entity.</li>
            <li>Attempting to reverse-engineer, decompile, or otherwise extract the source code of QRchive.</li>
          </ul>
          <p>We reserve the right to remove any content that violates these guidelines and to suspend or terminate
            accounts of users who breach this policy.</p>
        </section>

        <section id="content" class="policy-section">
          <h2 class="section-heading">
            <span class="material-symbols-outlined section-icon">image</span>User Content &amp; Intellectual Property
          </h2>
          <h3 class="sub-heading">Your Content</h3>
          <p>You retain full ownership of all photos, videos, and other content you upload to QRchive ("User Content").
            By uploading User Content, you grant QRchive a limited, non-exclusive, worldwide, royalty-free licence to
            store, process, and display your content solely to provide the Service (e.g., generating thumbnails,
            displaying in the event vault, enabling ZIP export).</p>
          <p>This licence is terminated when you delete your content or your event expires and data is removed per the
            retention policy.</p>
          <h3 class="sub-heading">QRchive's Intellectual Property</h3>
          <p>The QRchive platform, including its software, interface design, branding, QR generation logic, and all
            associated intellectual property, is owned exclusively by QRchive Atelier Inc. Nothing in these Terms grants
            you any right to use our trademarks, logos, or proprietary technology beyond what is necessary to use the
            Service.</p>
          <h3 class="sub-heading">Guest Consent</h3>
          <p>Event Owners are responsible for obtaining appropriate consent from Snap Guests and other individuals who
            appear in uploaded media. QRchive is not liable for content uploaded without the consent of the individuals
            depicted.</p>
        </section>

        <section id="payments" class="policy-section">
          <h2 class="section-heading">
            <span class="material-symbols-outlined section-icon">payments</span>Payments &amp; Packages
          </h2>
          <h3 class="sub-heading">Current Pricing Tiers</h3>
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Package</th>
                  <th>Guest Cap</th>
                  <th>Price</th>
                  <th>Photo Limit</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Standard Snap</td>
                  <td>Up to 100 guests</td>
                  <td>₱500</td>
                  <td>30 photos per guest</td>
                </tr>
                <tr>
                  <td>Standard Snap</td>
                  <td>Up to 300 guests</td>
                  <td>₱800</td>
                  <td>30 photos per guest</td>
                </tr>
                <tr>
                  <td>Standard Snap</td>
                  <td>300+ guests</td>
                  <td>₱1,000</td>
                  <td>30 photos per guest</td>
                </tr>
                <tr>
                  <td>Unlimited Snap</td>
                  <td>Up to 100 guests</td>
                  <td>₱1,000</td>
                  <td>Unlimited uploads</td>
                </tr>
                <tr>
                  <td>Unlimited Snap</td>
                  <td>Up to 300 guests</td>
                  <td>₱1,500</td>
                  <td>Unlimited uploads</td>
                </tr>
                <tr>
                  <td>Unlimited Snap</td>
                  <td>300+ guests</td>
                  <td>₱2,000</td>
                  <td>Unlimited uploads</td>
                </tr>
              </tbody>
            </table>
          </div>
          <h3 class="sub-heading">Storage Extension</h3>
          <p>After the standard 2-month storage period, you may extend cloud photo storage at a rate of <strong>+₱200
              per month</strong>. Extension must be purchased prior to the expiry of the current storage period. Media
            not covered by an active extension will be permanently deleted.</p>
          <h3 class="sub-heading">Payment Policy</h3>
          <ul class="policy-list">
            <li>All prices are in Philippine Peso (₱).</li>
            <li>Payments are non-refundable once an event has been activated and QR codes have been issued, unless the
              Service has been materially unavailable due to our fault.</li>
            <li>QRchive reserves the right to change pricing with 30 days' notice. Price changes do not affect events
              already purchased.</li>
          </ul>
        </section>

        <section id="storage" class="policy-section">
          <h2 class="section-heading">
            <span class="material-symbols-outlined section-icon">cloud</span>Storage &amp; Data Expiry
          </h2>
          <div class="policy-callout callout-gold">
            <span class="material-symbols-outlined">warning</span>
            <span>Media files are <strong>permanently deleted</strong> at the end of the storage period unless an
              extension is purchased. QRchive is not responsible for data lost due to expiry.</span>
          </div>
          <ul class="policy-list">
            <li>Guest upload deadline: <strong>1 month</strong> after the event date. No new uploads are accepted after
              this date.</li>
            <li>Cloud storage retention: <strong>2 months</strong> after the event date, after which all media is
              deleted from Cloudflare R2 storage.</li>
            <li>We will send a reminder notification to the Owner's registered email 7 days before storage expiry (where
              a valid email address is on file).</li>
            <li>Event owners are solely responsible for downloading and backing up their media prior to expiry.</li>
            <li>Cascade deletion: Deleting an event from the dashboard permanently deletes all associated guests,
              photos, checklists, and invitations immediately and irreversibly.</li>
          </ul>
        </section>

        <section id="termination" class="policy-section">
          <h2 class="section-heading">
            <span class="material-symbols-outlined section-icon">cancel</span>Termination
          </h2>
          <h3 class="sub-heading">By You</h3>
          <p>You may delete your account at any time by contacting us at <a class="policy-link"
              href="mailto:support@qrchive.app">support@qrchive.app</a>. Account deletion is irreversible and will
            permanently delete all associated events, guests, and media.</p>
          <h3 class="sub-heading">By QRchive</h3>
          <p>QRchive reserves the right to suspend or terminate your account immediately, with or without notice, if:
          </p>
          <ul class="policy-list">
            <li>You breach any provision of these Terms.</li>
            <li>We detect fraudulent, abusive, or illegal activity on your account.</li>
            <li>Required by law or regulatory authority.</li>
          </ul>
          <p>Upon termination, your right to access the Service immediately ceases. We may retain certain data as
            required by law or legitimate business purposes, subject to our Privacy Policy.</p>
        </section>

        <section id="liability" class="policy-section">
          <h2 class="section-heading">
            <span class="material-symbols-outlined section-icon">gavel</span>Limitation of Liability
          </h2>
          <p>To the maximum extent permitted by applicable law, QRchive and its officers, directors, employees, and
            agents shall not be liable for:</p>
          <ul class="policy-list">
            <li>Any indirect, incidental, special, consequential, or punitive damages arising from your use of the
              Service.</li>
            <li>Loss of data, media, or memories due to technical failures, accidental deletion, or storage expiry.</li>
            <li>Unauthorised access to your account or event vault by third parties, provided we have implemented
              reasonable security measures.</li>
            <li>Delays or failures caused by circumstances beyond our reasonable control, including internet outages,
              third-party service failures, or acts of nature.</li>
          </ul>
          <p>Our total aggregate liability to you for any claims arising from these Terms or the Service shall not
            exceed the total amount you paid to QRchive in the 12 months preceding the claim.</p>
          <p>The Service is provided "as is" and "as available" without warranties of any kind, express or implied,
            including but not limited to fitness for a particular purpose or uninterrupted availability.</p>
        </section>

        <section id="changes" class="policy-section">
          <h2 class="section-heading">
            <span class="material-symbols-outlined section-icon">update</span>Changes to Terms
          </h2>
          <p>We reserve the right to modify these Terms at any time. When we make material changes, we will notify
            registered account owners via email and update the "Last updated" date at the top of this page at least 14
            days before the changes take effect.</p>
          <p>Continued use of the Service after the effective date of the revised Terms constitutes your acceptance of
            the changes. If you do not agree to the new Terms, you must stop using the Service before the effective
            date.</p>
        </section>

        <section id="contact" class="policy-section">
          <h2 class="section-heading">
            <span class="material-symbols-outlined section-icon">contact_mail</span>Contact
          </h2>
          <p>If you have any questions about these Terms of Service, please contact us:</p>
          <div class="contact-card">
            <div class="contact-row">
              <span class="material-symbols-outlined">mail</span>
              <div>
                <div class="contact-label">General &amp; Legal Enquiries</div>
                <a class="policy-link" href="mailto:support@qrchive.app">support@qrchive.app</a>
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
          <a class="policy-link" @click.prevent="router.push('/privacy-policy')">Privacy Policy</a>
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
