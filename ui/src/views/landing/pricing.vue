<script setup>
const pricings = [
    {
        name: 'Basic',
        description: 'Ideal for intimate anniversary gatherings, weddings, and minimalist celebrations.',
        price: 299,
        pricingCategory: 'event',
        perks: [
            '30 snaps per guest only (photos and videos)',
            'Maximum of 30 guests/participants',
            'Maximum of 30 sec per video',
            'Unique link for each event for photo gallery',
            '15 days of online file access',
        ]
    },
    {
        name: 'Standard',
        bestChoice: true,
        description: 'Ideal for medium-sized gatherings, weddings, and festive parties.',
        price: 499,
        pricingCategory: 'event',
        perks: [
            'Unlimited snaps per guest (photos and videos)',
            'Maximum of 500 guests/participants',
            'Maximum of 30 sec per video',
            'Unique link for each event for photo gallery',
            '1 month of online file access'
        ]
    },
    {
        name: 'Pro',
        price: 3999,
        pricingCategory: 'month',
        description: 'Perfect for event planners handling multiple events',
        perks: [
            'Unlimited event creation',
            'Unlimited guests/participants',
            'Separate gallery for every event',
            'Unlimited snaps per guest (photos and videos)',
            'Maximum of 30 sec per video',
            'Unique link for each event for photo gallery',
            '1 month of online file access'
        ]
    },
]
const globalFunctions = inject('globalFunctions');
</script>
<template>
    <section id="pricing" class="pricing-section">
        <div class="section-container">
            <!-- Section Heading -->
            <div class="section-header text-center">
                <h2 class="section-title">Choose Your Event Package</h2>
                <p class="section-description">
                    Simple per-celebration flat pricing tailored to your guest size with zero surprise fees.
                </p>
            </div>

            <!-- Dual Tier Comparison Cards -->
            <div class="pricing-grid">
                <!-- TIER 1: Standard Snap -->
                <div class="pricing-card" v-for="x in pricings" :class="{ 'featured-pricing-card': x.bestChoice }">
                    <div class="pricing-card-top">
                        <div class="cherished-badge" v-if="x.bestChoice">
                            <JIcon name="heart" />
                            <span>Top Choice</span>
                            <JIcon name="heart" />
                        </div>
                        <div class="pricing-title-row">
                            <h3 class="pricing-title">{{ x.name }} Snap</h3>
                        </div>
                        <p class="pricing-desc mb-1">
                            {{ x.description }}
                        </p>
                        <p>
                            <span class="price">Php {{ globalFunctions.formatCurrency(x.price) }}</span> /
                            {{ x.pricingCategory }}
                        </p>
                        <!-- Perks List -->
                        <ul class="perks-list">
                            <li class="perk-item" v-for="y in x.perks">
                                <JIcon name="circle-check" color="primary" />
                                <span>{{ y }}</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="extension-banner">
                <span class="extension-dot">•</span>
                <p class="extension-text">
                    Need more time? Extend uploading deadline or cloud photo storage anytime for only
                    <strong>Php {{ globalFunctions.formatCurrency(200) }} / month</strong>.
                </p>
            </div>
        </div>
    </section>
</template>