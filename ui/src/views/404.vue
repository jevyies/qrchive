<route lang="yaml">
meta:
  layout: blank
  public: true
</route>

<script setup>
import { useRouter } from 'vue-router'
import AppLogo from '@core/components/AppLogo.vue'
import keannAndJennyBg from '@/assets/images/keann-and-jenny.jpg'

const router = useRouter()

const handleGoHome = () => {
  router.push('/')
}
</script>

<template>
  <div class="not-found-vault-root">
    <main class="not-found-viewport" :style="{ backgroundImage: `url(${keannAndJennyBg})` }">
      <!-- Atmospheric Editorial Overlays -->
      <div class="vault-vignette-top"></div>
      <div class="vault-vignette-radial"></div>
      <div class="vault-vignette-scrim"></div>

      <!-- Header Tier: Atelier Brand -->
      <header class="vault-header">
        <div class="brand-badge" role="button" tabindex="0" aria-label="Return to Homepage" @click="handleGoHome">
          <AppLogo :width="24" :height="24" color="#fff8f5" class="brand-logo" />
          <div class="brand-info">
            <span class="brand-title">QRchive</span>
            <span class="brand-subtitle">Celebration Vault</span>
          </div>
        </div>
      </header>

      <!-- Center 404 Haute Hero Card -->
      <div class="not-found-card-wrapper">
        <div class="not-found-card">
          <!-- Status Pill -->
          <div class="status-pill">
            <span class="material-symbols-outlined status-icon">search_off</span>
            <span class="status-text">404 • Not Found</span>
          </div>

          <!-- Haute Title -->
          <h1 class="not-found-title">Celebration Vault Not Found</h1>

          <!-- User Requested Exact Description -->
          <div class="description-badge">
            <span class="material-symbols-outlined desc-icon">link_off</span>
            <p class="description-text">Link was not in the system</p>
          </div>

          <p class="not-found-narrative">
            The event token or invitation link you are trying to access does not exist, has expired, or was removed.
          </p>

          <!-- Primary Return Action CTA -->
          <button id="returnHomeBtn" type="button" class="return-home-btn" @click="handleGoHome">
            <span class="material-symbols-outlined return-icon">home</span>
            <span class="return-text">Return to Homepage</span>
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.not-found-vault-root {
  position: relative;
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
  background-color: #0b0908;
  font-family: 'Outfit', sans-serif;
  color: #fff8f5;
}

.not-found-viewport {
  position: relative;
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

/* Atmospheric Overlays */
.vault-vignette-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 240px;
  background: linear-gradient(180deg, rgba(8, 7, 6, 0.85) 0%, rgba(8, 7, 6, 0) 100%);
  pointer-events: none;
  z-index: 1;
}

.vault-vignette-radial {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center 35%, rgba(12, 10, 9, 0.4) 0%, rgba(8, 7, 6, 0.88) 100%);
  pointer-events: none;
  z-index: 1;
}

.vault-vignette-scrim {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 480px;
  background: linear-gradient(0deg, rgba(8, 7, 6, 0.98) 0%, rgba(8, 7, 6, 0.7) 60%, rgba(8, 7, 6, 0) 100%);
  pointer-events: none;
  z-index: 1;
}

/* Header */
.vault-header {
  position: relative;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem 0.5rem 0.75rem;
  border-radius: 9999px;
  background: rgba(22, 18, 16, 0.65);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(235, 215, 195, 0.15);
  cursor: pointer;
  transition: all 0.25s ease;
}

.brand-badge:hover {
  background: rgba(35, 29, 25, 0.85);
  border-color: rgba(235, 215, 195, 0.3);
  transform: translateY(-1px);
}

.brand-logo {
  flex-shrink: 0;
}

.brand-info {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #fff8f5;
  line-height: 1.1;
}

.brand-subtitle {
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #e5b382;
  font-weight: 500;
}

/* Center Card */
.not-found-card-wrapper {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem 4rem;
  flex: 1;
}

.not-found-card {
  max-width: 480px;
  width: 100%;
  padding: 2.5rem 2rem;
  background: rgba(18, 15, 13, 0.75);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(235, 215, 195, 0.16);
  border-radius: 1.5rem;
  box-shadow: 0 24px 64px -12px rgba(0, 0, 0, 0.75);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  animation: cardFadeIn 0.5s ease-out;
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.85rem;
  border-radius: 9999px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 1.25rem;
}

.status-icon {
  font-size: 1rem;
}

.not-found-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.85rem;
  font-weight: 600;
  line-height: 1.25;
  color: #fff8f5;
  margin: 0 0 1.25rem;
  letter-spacing: -0.01em;
}

.description-badge {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.85rem 1.25rem;
  background: rgba(229, 179, 130, 0.08);
  border: 1px dashed rgba(229, 179, 130, 0.4);
  border-radius: 0.85rem;
  margin-bottom: 1.25rem;
  width: 100%;
  justify-content: center;
}

.desc-icon {
  color: #e5b382;
  font-size: 1.25rem;
}

.description-text {
  font-size: 1.05rem;
  font-weight: 600;
  color: #f7e6d4;
  margin: 0;
  letter-spacing: 0.02em;
}

.not-found-narrative {
  font-size: 0.9rem;
  line-height: 1.6;
  color: #bfaea0;
  margin: 0 0 2rem;
  max-width: 360px;
}

.return-home-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.95rem 1.75rem;
  border-radius: 0.85rem;
  background: linear-gradient(135deg, #d49563 0%, #ba7e4c 100%);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  border: none;
  cursor: pointer;
  box-shadow: 0 8px 24px -4px rgba(212, 149, 99, 0.4);
  transition: all 0.25s ease;
}

.return-home-btn:hover {
  background: linear-gradient(135deg, #dfa271 0%, #c98b58 100%);
  box-shadow: 0 12px 28px -4px rgba(212, 149, 99, 0.55);
  transform: translateY(-2px);
}

.return-home-btn:active {
  transform: translateY(0);
}

.return-icon {
  font-size: 1.2rem;
}

@media (max-width: 480px) {
  .vault-header {
    padding: 1.25rem 1rem;
  }
  .not-found-card {
    padding: 2rem 1.25rem;
  }
  .not-found-title {
    font-size: 1.5rem;
  }
  .description-text {
    font-size: 0.95rem;
  }
}
</style>
