import { buildApp } from './src/server';
import jwt from 'jsonwebtoken';
import { db, client, users, stores, weddings, guests, guestTables } from './src/db';
import { eq } from 'drizzle-orm';

const JWT_SECRET =
  process.env.JWT_SECRET || 'qrchive-super-secret-jwt-key-change-in-production';

async function runEndpointTests() {
  console.log('🚀 Initializing Fastify app for modular endpoints verification...');
  const app = await buildApp();
  await app.ready();

  const timestamp = Date.now();
  const testUsername = `test_admin_${timestamp}`;

  let testUser: any = null;
  let authHeader = '';

  try {
    // 0. Seed a test user and generate Bearer JWT
    console.log('\n--- Step 0: Seed Admin User & Auth Token ---');
    const [createdUser] = await db
      .insert(users)
      .values({
        firstname: 'Eleanor',
        lastname: 'Roosevelt',
        username: testUsername,
        email: `${testUsername}@example.com`,
        status: 'active',
        authPosition: 'owner',
      })
      .returning();
    testUser = createdUser;

    const token = jwt.sign(
      {
        sub: testUser.id,
        username: testUser.username,
        email: testUser.email,
      },
      JWT_SECRET,
      { expiresIn: '5m' }
    );
    authHeader = `Bearer ${token}`;
    console.log(`✓ Admin user created with ID ${testUser.id} and token generated`);

    // ==========================================
    // 1. STORES & STORE_USERS TESTS
    // ==========================================
    console.log('\n--- Test Group 1: Stores & Store Users ---');

    // 1.1 Create Store
    const createStoreRes = await app.inject({
      method: 'POST',
      url: '/api/stores',
      headers: { authorization: authHeader },
      payload: {
        name: `Blissful Moments Floral_${timestamp}`,
        email: `contact_${timestamp}@blissfulfloral.com`,
        description: 'Premium wedding florals and bespoke decor',
        driveDetails: { folderId: 'drive-folder-abc-123', storageQuota: '50GB' },
        defaultPassword: 'StorePassword2026!',
        dateStarted: '2026-01-15',
        assignCurrentUser: true,
      },
    });
    console.log('1.1 Create Store status:', createStoreRes.statusCode);
    if (createStoreRes.statusCode !== 201) {
      throw new Error(`Create store failed: ${createStoreRes.body}`);
    }
    const createdStore = JSON.parse(createStoreRes.body).store;
    console.log(`✓ Store created with ID ${createdStore.id}`);

    // 1.2 List Stores
    const listStoresRes = await app.inject({
      method: 'GET',
      url: `/api/stores?search=Blissful Moments Floral_${timestamp}`,
      headers: { authorization: authHeader },
    });
    console.log('1.2 List Stores status:', listStoresRes.statusCode);
    if (listStoresRes.statusCode !== 200) {
      throw new Error(`List stores failed: ${listStoresRes.body}`);
    }
    const storeListJson = JSON.parse(listStoresRes.body);
    if (storeListJson.stores.length === 0) {
      throw new Error('Created store not found in list response');
    }
    console.log(`✓ Listed ${storeListJson.total} store(s) successfully`);

    // 1.3 Get Store by ID
    const getStoreRes = await app.inject({
      method: 'GET',
      url: `/api/stores/${createdStore.id}`,
      headers: { authorization: authHeader },
    });
    console.log('1.3 Get Store by ID status:', getStoreRes.statusCode);
    if (getStoreRes.statusCode !== 200) {
      throw new Error(`Get store failed: ${getStoreRes.body}`);
    }
    const storeDetails = JSON.parse(getStoreRes.body).store;
    if (storeDetails.users.length === 0 || storeDetails.users[0].id !== testUser.id) {
      throw new Error('Store creator was not automatically assigned in store_users');
    }
    console.log(`✓ Get store returned ${storeDetails.users.length} assigned user(s)`);

    // 1.4 Update Store
    const updateStoreRes = await app.inject({
      method: 'PUT',
      url: `/api/stores/${createdStore.id}`,
      headers: { authorization: authHeader },
      payload: {
        description: 'Updated floral boutique & decor styling services',
      },
    });
    console.log('1.4 Update Store status:', updateStoreRes.statusCode);
    if (updateStoreRes.statusCode !== 200) {
      throw new Error(`Update store failed: ${updateStoreRes.body}`);
    }
    console.log('✓ Store updated successfully');

    // 1.5 Store Users: Seed extra user and assign
    const [assistantUser] = await db
      .insert(users)
      .values({
        firstname: 'Franklin',
        lastname: 'Delano',
        username: `assistant_${timestamp}`,
        email: `assistant_${timestamp}@example.com`,
        status: 'active',
        authPosition: 'ordinary',
      })
      .returning();

    const assignUserRes = await app.inject({
      method: 'POST',
      url: `/api/stores/${createdStore.id}/users`,
      headers: { authorization: authHeader },
      payload: { userId: assistantUser.id },
    });
    console.log('1.5 Assign User to Store status:', assignUserRes.statusCode);
    if (assignUserRes.statusCode !== 201) {
      throw new Error(`Assign user failed: ${assignUserRes.body}`);
    }
    console.log(`✓ User ${assistantUser.id} assigned to store ${createdStore.id}`);

    // 1.6 Query Store Users
    const queryStoreUsersRes = await app.inject({
      method: 'GET',
      url: `/api/stores/${createdStore.id}/users`,
      headers: { authorization: authHeader },
    });
    const storeUsersList = JSON.parse(queryStoreUsersRes.body).users;
    if (storeUsersList.length !== 2) {
      throw new Error(`Expected 2 users in store, got ${storeUsersList.length}`);
    }
    console.log(`✓ Verified store now has ${storeUsersList.length} assigned users`);

    // 1.7 Remove User from Store
    const removeUserRes = await app.inject({
      method: 'DELETE',
      url: `/api/stores/${createdStore.id}/users/${assistantUser.id}`,
      headers: { authorization: authHeader },
    });
    console.log('1.7 Remove user status:', removeUserRes.statusCode);
    if (removeUserRes.statusCode !== 200) {
      throw new Error(`Remove user from store failed: ${removeUserRes.body}`);
    }
    console.log('✓ User removed from store successfully');

    // ==========================================
    // 2. WEDDINGS & WEDDING_USERS TESTS
    // ==========================================
    console.log('\n--- Test Group 2: Weddings & Wedding Users ---');

    // 2.1 Create Wedding
    const createWeddingRes = await app.inject({
      method: 'POST',
      url: '/api/weddings',
      headers: { authorization: authHeader },
      payload: {
        brideFirstname: 'Juliet',
        brideLastname: 'Capulet',
        groomFirstname: 'Romeo',
        groomLastname: 'Montague',
        invitationDeadline: '2026-10-01T23:59:59.000Z',
        weddingDate: '2026-11-15T16:00:00.000Z',
        assignCurrentUser: true,
      },
    });
    console.log('2.1 Create Wedding status:', createWeddingRes.statusCode);
    if (createWeddingRes.statusCode !== 201) {
      throw new Error(`Create wedding failed: ${createWeddingRes.body}`);
    }
    const createdWedding = JSON.parse(createWeddingRes.body).wedding;
    console.log(`✓ Wedding created with ID ${createdWedding.id}`);

    // 2.2 List Weddings
    const listWeddingsRes = await app.inject({
      method: 'GET',
      url: '/api/weddings?search=Capulet',
      headers: { authorization: authHeader },
    });
    console.log('2.2 List Weddings status:', listWeddingsRes.statusCode);
    if (listWeddingsRes.statusCode !== 200) {
      throw new Error(`List weddings failed: ${listWeddingsRes.body}`);
    }
    const weddingListJson = JSON.parse(listWeddingsRes.body);
    console.log(`✓ Found ${weddingListJson.total} wedding(s) in search`);

    // 2.3 Get Wedding by ID
    const getWeddingRes = await app.inject({
      method: 'GET',
      url: `/api/weddings/${createdWedding.id}`,
      headers: { authorization: authHeader },
    });
    console.log('2.3 Get Wedding by ID status:', getWeddingRes.statusCode);
    if (getWeddingRes.statusCode !== 200) {
      throw new Error(`Get wedding failed: ${getWeddingRes.body}`);
    }
    const weddingDetails = JSON.parse(getWeddingRes.body).wedding;
    console.log(`✓ Wedding details: "${weddingDetails.coupleNames}"`);

    // 2.4 Update Wedding
    const updateWeddingRes = await app.inject({
      method: 'PUT',
      url: `/api/weddings/${createdWedding.id}`,
      headers: { authorization: authHeader },
      payload: {
        weddingDate: '2026-11-20T17:00:00.000Z',
      },
    });
    console.log('2.4 Update Wedding status:', updateWeddingRes.statusCode);
    if (updateWeddingRes.statusCode !== 200) {
      throw new Error(`Update wedding failed: ${updateWeddingRes.body}`);
    }
    console.log('✓ Wedding date updated successfully');

    // 2.5 Wedding Users: Assign & Remove
    const assignWeddingUserRes = await app.inject({
      method: 'POST',
      url: `/api/weddings/${createdWedding.id}/users`,
      headers: { authorization: authHeader },
      payload: { userId: assistantUser.id },
    });
    console.log('2.5 Assign User to Wedding status:', assignWeddingUserRes.statusCode);
    if (assignWeddingUserRes.statusCode !== 201) {
      throw new Error(`Assign user to wedding failed: ${assignWeddingUserRes.body}`);
    }

    const getWeddingUsersRes = await app.inject({
      method: 'GET',
      url: `/api/weddings/${createdWedding.id}/users`,
      headers: { authorization: authHeader },
    });
    console.log('2.5 Get Wedding Users count:', JSON.parse(getWeddingUsersRes.body).users.length);

    await app.inject({
      method: 'DELETE',
      url: `/api/weddings/${createdWedding.id}/users/${assistantUser.id}`,
      headers: { authorization: authHeader },
    });
    console.log('✓ Wedding user assignment and removal verified');

    // ==========================================
    // 3. GUEST TABLES TESTS
    // ==========================================
    console.log('\n--- Test Group 3: Guest Tables ---');

    // 3.1 Create Guest Table
    const createTableRes = await app.inject({
      method: 'POST',
      url: '/api/guests/tables',
      headers: { authorization: authHeader },
      payload: {
        name: `VIP Table Alpha_${timestamp}`,
        description: 'Reserved for bridal party and immediate family',
      },
    });
    console.log('3.1 Create Guest Table status:', createTableRes.statusCode);
    if (createTableRes.statusCode !== 201) {
      throw new Error(`Create table failed: ${createTableRes.body}`);
    }
    const createdTable = JSON.parse(createTableRes.body).table;
    console.log(`✓ Guest Table created with ID ${createdTable.id}`);

    // 3.2 List Guest Tables
    const listTablesRes = await app.inject({
      method: 'GET',
      url: `/api/guests/tables?search=VIP Table Alpha_${timestamp}`,
      headers: { authorization: authHeader },
    });
    console.log('3.2 List Guest Tables status:', listTablesRes.statusCode);
    if (listTablesRes.statusCode !== 200) {
      throw new Error(`List tables failed: ${listTablesRes.body}`);
    }
    console.log('✓ Guest Tables listed successfully');

    // 3.3 Update Guest Table
    const updateTableRes = await app.inject({
      method: 'PUT',
      url: `/api/guests/tables/${createdTable.id}`,
      headers: { authorization: authHeader },
      payload: {
        description: 'Updated seating notes: includes high chair',
      },
    });
    console.log('3.3 Update Guest Table status:', updateTableRes.statusCode);
    if (updateTableRes.statusCode !== 200) {
      throw new Error(`Update table failed: ${updateTableRes.body}`);
    }
    console.log('✓ Guest Table updated successfully');

    // ==========================================
    // 4. GUESTS & RSVP TESTS
    // ==========================================
    console.log('\n--- Test Group 4: Guests & RSVP ---');

    // 4.1 Create Guest (with auto-generated linkId)
    const createGuestRes = await app.inject({
      method: 'POST',
      url: '/api/guests',
      headers: { authorization: authHeader },
      payload: {
        weddingId: createdWedding.id,
        firstname: 'Mercutio',
        lastname: 'Escalus',
        tableId: createdTable.id,
      },
    });
    console.log('4.1 Create Guest status:', createGuestRes.statusCode);
    if (createGuestRes.statusCode !== 201) {
      throw new Error(`Create guest failed: ${createGuestRes.body}`);
    }
    const createdGuest = JSON.parse(createGuestRes.body).guest;
    console.log(`✓ Guest created with ID ${createdGuest.id} and auto linkId "${createdGuest.linkId}"`);

    // 4.2 Batch Create Guests
    const batchGuestRes = await app.inject({
      method: 'POST',
      url: '/api/guests/batch',
      headers: { authorization: authHeader },
      payload: {
        weddingId: createdWedding.id,
        guests: [
          { firstname: 'Benvolio', lastname: 'Montague', tableId: createdTable.id },
          { firstname: 'Tybalt', lastname: 'Capulet', status: 'pending' },
        ],
      },
    });
    console.log('4.2 Batch Create Guests status:', batchGuestRes.statusCode);
    if (batchGuestRes.statusCode !== 201) {
      throw new Error(`Batch create guests failed: ${batchGuestRes.body}`);
    }
    const batchJson = JSON.parse(batchGuestRes.body);
    console.log(`✓ Batch created ${batchJson.count} guests successfully`);

    // 4.3 List Guests with Filters
    const listGuestsRes = await app.inject({
      method: 'GET',
      url: `/api/guests?weddingId=${createdWedding.id}&tableId=${createdTable.id}`,
      headers: { authorization: authHeader },
    });
    console.log('4.3 List Guests status:', listGuestsRes.statusCode);
    if (listGuestsRes.statusCode !== 200) {
      throw new Error(`List guests failed: ${listGuestsRes.body}`);
    }
    const guestListJson = JSON.parse(listGuestsRes.body);
    if (guestListJson.guests.length !== 2) {
      throw new Error(`Expected 2 guests at table ${createdTable.id}, got ${guestListJson.guests.length}`);
    }
    console.log(`✓ Filtered guests verified: ${guestListJson.guests.length} guests at Table ${createdTable.id}`);

    // 4.4 Get Guest by ID
    const getGuestRes = await app.inject({
      method: 'GET',
      url: `/api/guests/${createdGuest.id}`,
      headers: { authorization: authHeader },
    });
    console.log('4.4 Get Guest by ID status:', getGuestRes.statusCode);
    const guestById = JSON.parse(getGuestRes.body).guest;
    console.log(`✓ Guest details retrieved: ${guestById.fullname} seated at "${guestById.table?.name}"`);

    // 4.5 Public RSVP Lookup by linkId (No Auth Required)
    const publicLookupRes = await app.inject({
      method: 'GET',
      url: `/api/guests/by-link/${createdGuest.linkId}`,
    });
    console.log('4.5 Public RSVP Lookup status:', publicLookupRes.statusCode);
    if (publicLookupRes.statusCode !== 200) {
      throw new Error(`Public RSVP lookup failed: ${publicLookupRes.body}`);
    }
    const rsvpGuestData = JSON.parse(publicLookupRes.body).guest;
    console.log(`✓ Public RSVP found invitation for ${rsvpGuestData.fullname}, couple: "${rsvpGuestData.coupleNames}"`);

    // 4.6 Public RSVP Confirmation (attending)
    const publicRsvpRes = await app.inject({
      method: 'POST',
      url: `/api/guests/rsvp/${createdGuest.linkId}`,
      payload: { status: 'attending' },
    });
    console.log('4.6 Public RSVP Response status:', publicRsvpRes.statusCode);
    if (publicRsvpRes.statusCode !== 200) {
      throw new Error(`Public RSVP response failed: ${publicRsvpRes.body}`);
    }
    const rsvpConfirmed = JSON.parse(publicRsvpRes.body);
    console.log(`✓ RSVP confirmed: "${rsvpConfirmed.message}"`);

    // 4.7 Quick Status Update (PATCH /:id/status)
    const patchStatusRes = await app.inject({
      method: 'PATCH',
      url: `/api/guests/${createdGuest.id}/status`,
      headers: { authorization: authHeader },
      payload: { status: 'declined' },
    });
    console.log('4.7 Quick Status Update status:', patchStatusRes.statusCode);
    if (patchStatusRes.statusCode !== 200) {
      throw new Error(`Quick status update failed: ${patchStatusRes.body}`);
    }
    console.log('✓ Guest status changed to declined');

    // 4.8 Wedding Guests Shortcut (GET /api/weddings/:id/guests)
    const weddingGuestsRes = await app.inject({
      method: 'GET',
      url: `/api/weddings/${createdWedding.id}/guests`,
      headers: { authorization: authHeader },
    });
    console.log('4.8 Wedding Guests Shortcut status:', weddingGuestsRes.statusCode);
    const weddingGuestsCount = JSON.parse(weddingGuestsRes.body).total;
    if (weddingGuestsCount !== 3) {
      throw new Error(`Expected 3 wedding guests, got ${weddingGuestsCount}`);
    }
    console.log(`✓ Wedding guests shortcut returned ${weddingGuestsCount} total guests`);

    // ==========================================
    // 5. OPENAPI SWAGGER SPECIFICATION CHECK
    // ==========================================
    console.log('\n--- Test Group 5: OpenAPI Swagger Spec ---');
    const openApiRes = await app.inject({
      method: 'GET',
      url: '/openapi.json',
    });
    console.log('5.1 OpenAPI spec status:', openApiRes.statusCode);
    const spec = JSON.parse(openApiRes.body);
    const paths = Object.keys(spec.paths);

    const requiredEndpoints = [
      '/api/stores/',
      '/api/stores/{id}',
      '/api/stores/{id}/users',
      '/api/stores/users',
      '/api/weddings/',
      '/api/weddings/{id}',
      '/api/weddings/{id}/guests',
      '/api/weddings/{id}/users',
      '/api/guests/tables',
      '/api/guests/tables/{id}',
      '/api/guests/',
      '/api/guests/by-link/{linkId}',
      '/api/guests/rsvp/{linkId}',
      '/api/guests/{id}',
      '/api/guests/batch',
      '/api/guests/{id}/status',
    ];

    for (const ep of requiredEndpoints) {
      if (!paths.includes(ep)) {
        throw new Error(`Missing required endpoint in OpenAPI spec: ${ep}`);
      }
    }
    console.log(`✓ All ${requiredEndpoints.length} expected endpoint paths verified in OpenAPI spec!`);


    // ==========================================
    // 6. CLEANUP
    // ==========================================
    console.log('\n--- Cleanup ---');
    await app.inject({
      method: 'DELETE',
      url: `/api/stores/${createdStore.id}`,
      headers: { authorization: authHeader },
    });
    await app.inject({
      method: 'DELETE',
      url: `/api/weddings/${createdWedding.id}`,
      headers: { authorization: authHeader },
    });
    await app.inject({
      method: 'DELETE',
      url: `/api/guests/tables/${createdTable.id}`,
      headers: { authorization: authHeader },
    });
    await db.delete(users).where(eq(users.id, assistantUser.id));
    await db.delete(users).where(eq(users.id, testUser.id));
    console.log('✓ Cleaned up all test entities successfully.');

    console.log('\n🎉 ALL MODULAR ENDPOINT TESTS PASSED SUCCESSFULLY! 🎉\n');
  } catch (err) {
    console.error('\n❌ Test execution failed:', err);
    if (testUser) {
      await db.delete(users).where(eq(users.id, testUser.id)).catch(() => {});
    }
    process.exit(1);
  } finally {
    await app.close();
    await client.end();
    process.exit(0);
  }
}

runEndpointTests();
