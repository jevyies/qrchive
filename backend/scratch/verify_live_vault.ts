import { buildApp } from '../src/server';
import { db, events, snapGuests, snapPhotos, snapPhotoLikes, users } from '../src/db';
import { eq, desc } from 'drizzle-orm';
import WebSocket from 'ws';

async function main() {
  console.log('🚀 Starting Automated Verification for Live Vault Features...\n');

  const app = await buildApp();
  const address = await app.listen({ port: 0, host: '127.0.0.1' });
  const port = (app.server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  const wsUrl = `ws://127.0.0.1:${port}`;

  console.log(`✓ Test server running on ${baseUrl}`);

  try {
    // 1. Setup or retrieve test event, guest, and photos
    let event = await db.query.events.findFirst();
    if (!event) {
      let user = await db.query.users.findFirst();
      if (!user) {
        const [u] = await db
          .insert(users)
          .values({
            email: 'test_host@qrchive.com',
            username: 'test_host',
            firstname: 'Test',
            lastname: 'Host',
          })
          .returning();
        user = u;
      }
      const [ev] = await db
        .insert(events)
        .values({
          name: 'Test Live Vault Event',
          token: 'test-vault-event',
          userId: user.id,
        })
        .returning();
      event = ev;
    }

    const eventId = event.id;
    console.log(`✓ Using Event ID: ${eventId}, token: ${event.token}`);

    // Create a test guest
    let guest = await db.query.snapGuests.findFirst({
      where: eq(snapGuests.eventId, eventId),
    });
    if (!guest) {
      const [g] = await db
        .insert(snapGuests)
        .values({
          name: 'Alice Guest',
          eventId,
        })
        .returning();
      guest = g;
    }

    // Seed 12 sample photos to test descending order and 10 per page limit
    const existingPhotos = await db.query.snapPhotos.findMany({
      where: eq(snapPhotos.uploadedBy, guest.id),
      limit: 15,
    });

    if (existingPhotos.length < 12) {
      const needed = 12 - existingPhotos.length;
      for (let i = 0; i < needed; i++) {
        await db.insert(snapPhotos).values({
          uploadedBy: guest.id,
          url: `http://localhost:3001/api/photos/sample_${i}.jpg`,
          fileName: `sample_${i}.jpg`,
          status: 'completed',
        });
      }
      console.log(`✓ Seeded ${needed} sample photos for testing`);
    }

    // 2. Test GET /api/photos/events/:eventId with limit 10
    console.log('\n--- 1. Testing GET /api/photos/events/:eventId ---');
    const listRes = await fetch(`${baseUrl}/api/photos/events/${eventId}?limit=10&page=1`);
    if (!listRes.ok) {
      throw new Error(`GET /events/${eventId} failed with status ${listRes.status}`);
    }
    const listData = await listRes.json();

    console.log(`Total photos: ${listData.total}`);
    console.log(`Page: ${listData.page}, Limit: ${listData.limit}`);
    console.log(`Returned photos count: ${listData.photos.length}`);

    if (listData.photos.length > 10) {
      throw new Error(`Expected at most 10 photos, got ${listData.photos.length}`);
    }

    const sample = listData.photos[0];
    console.log('Sample photo structure:', JSON.stringify(sample, null, 2));

    // Verify properties
    if (!sample.id || !sample.thumbnailUrl || !sample.fullUrl || !sample.uploadedBy || !sample.createdAt) {
      throw new Error('Photo response missing required fields (id, thumbnailUrl, fullUrl, uploadedBy, createdAt)');
    }

    if (!sample.thumbnailUrl.includes('image/width=500,quality=80,format=auto')) {
      throw new Error(`thumbnailUrl does not match requested format: ${sample.thumbnailUrl}`);
    }
    console.log('✓ Thumbnail URL correctly formatted with Cloudflare Image parameters!');
    console.log('✓ Simplified response format verified!');

    // 3. Test WebSocket connection and subscription
    console.log('\n--- 2. Testing WebSocket connection ---');
    const wsReceivedMessages: any[] = [];
    const clientWs = new WebSocket(`${wsUrl}/api/photos/ws/${eventId}`);

    await new Promise<void>((resolve, reject) => {
      clientWs.on('open', () => {
        console.log('✓ WebSocket connected successfully');
      });
      clientWs.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        wsReceivedMessages.push(msg);
        if (msg.type === 'connection_ack') {
          console.log('✓ Received connection_ack from server:', msg.data);
          resolve();
        }
      });
      clientWs.on('error', reject);
      setTimeout(() => reject(new Error('WebSocket connection timed out')), 5000);
    });

    // 4. Test Like system HTTP toggle and WebSocket broadcast
    console.log('\n--- 3. Testing Photo Like System ---');
    const targetPhotoId = sample.id;
    const testUser = 'guest_tester_99';

    // Toggle 1: Like
    const likeRes1 = await fetch(`${baseUrl}/api/photos/${targetPhotoId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIdentifier: testUser }),
    });
    const likeData1 = await likeRes1.json();
    console.log('Like toggle 1 result:', likeData1);

    if (!likeData1.isLiked || likeData1.likesCount < 1) {
      throw new Error(`Expected photo to be liked, got: ${JSON.stringify(likeData1)}`);
    }

    // Wait a brief moment for WebSocket broadcast
    await new Promise((r) => setTimeout(r, 200));

    const wsLikeMsg = wsReceivedMessages.find(
      (m) => m.type === 'photo_liked' && m.data?.photoId === targetPhotoId
    );
    if (!wsLikeMsg) {
      throw new Error('WebSocket did not receive photo_liked event');
    }
    console.log('✓ WebSocket received photo_liked broadcast:', wsLikeMsg.data);

    // Toggle 2: Unlike
    const likeRes2 = await fetch(`${baseUrl}/api/photos/${targetPhotoId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIdentifier: testUser }),
    });
    const likeData2 = await likeRes2.json();
    console.log('Like toggle 2 (unlike) result:', likeData2);

    if (likeData2.isLiked !== false) {
      throw new Error(`Expected photo to be unliked, got: ${JSON.stringify(likeData2)}`);
    }
    console.log('✓ Unlike toggle verified!');

    clientWs.close();
    console.log('✓ WebSocket connection closed successfully');

    console.log('\n========================================');
    console.log('🎉 ALL AUTOMATED TESTS PASSED SUCCESSFULLY!');
    console.log('========================================\n');
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
