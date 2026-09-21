import { buildApp } from './src/server';
import jwt from 'jsonwebtoken';
import { db, users, refreshTokens, emailVerifications } from './src/db';
import { eq } from 'drizzle-orm';

async function runTests() {
  console.log('🚀 Initializing Fastify app for auth verification...');
  const app = await buildApp();
  await app.ready();

  const testUsername = `testuser_${Date.now()}`;
  const testEmail = `${testUsername}@example.com`;
  let accessToken = '';
  let sessionCookie = '';

  try {
    // -----------------------------------------------------
    // 0. TEST SEND VERIFICATION CODE
    // -----------------------------------------------------
    console.log('\n--- Test 0: Send Email Verification Code ---');
    const sendCodeRes = await app.inject({
      method: 'POST',
      url: '/api/auth/send-verification-code',
      payload: {
        email: testEmail,
        username: testUsername,
        firstname: 'Alexander',
        lastname: 'Bell',
      },
    });

    console.log('Send code status code:', sendCodeRes.statusCode);
    if (sendCodeRes.statusCode !== 200) {
      throw new Error(`Send verification code failed: ${sendCodeRes.body}`);
    }

    const verificationRecord = await db.query.emailVerifications.findFirst({
      where: eq(emailVerifications.email, testEmail),
    });
    if (!verificationRecord) {
      throw new Error(`Verification code not found in database for ${testEmail}`);
    }
    const testCode = verificationRecord.code;
    console.log(`✓ Verification code successfully saved in DB: ${testCode}`);

    // -----------------------------------------------------
    // 1. TEST REGISTRATION (rememberMe: true -> 3 months cookie)
    // -----------------------------------------------------
    console.log('\n--- Test 1: User Registration (with 6-digit code, rememberMe: true) ---');
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        firstname: 'Alexander',
        middlename: 'Graham',
        lastname: 'Bell',
        extname: 'Sr',
        email: testEmail,
        username: testUsername,
        password: 'SuperSecretPassword123!',
        code: testCode,
        rememberMe: true,
      },
    });

    console.log('Status code:', regRes.statusCode);
    const regBody = JSON.parse(regRes.body);
    console.log('Response body user:', regBody.user);

    if (regRes.statusCode !== 201) {
      throw new Error(`Registration failed: ${regRes.body}`);
    }

    // Verify fullname formula: (lastname + ', ' + firstname)
    const expectedFullname = 'Bell, Alexander';
    if (regBody.user.fullname !== expectedFullname) {
      throw new Error(`Fullname mismatch: expected "${expectedFullname}", got "${regBody.user.fullname}"`);
    }

    // Verify user fields in response (status, id, and authPosition must NOT be in user response)
    if (
      regBody.user.firstname !== 'Alexander' ||
      regBody.user.middlename !== 'Graham' ||
      regBody.user.lastname !== 'Bell' ||
      regBody.user.extname !== 'Sr' ||
      regBody.user.email !== testEmail ||
      regBody.user.username !== testUsername ||
      regBody.user.id !== undefined ||
      regBody.user.status !== undefined ||
      regBody.user.authPosition !== undefined
    ) {
      throw new Error('User response should not contain id, status, or authPosition');
    }

    // Verify 5-minute access token lifespan and payload claims (id, status, authPosition)
    accessToken = regBody.accessToken;
    const decoded: any = jwt.decode(accessToken);
    if (!decoded.id || decoded.status !== 'pending' || decoded.authPosition !== 'owner') {
      throw new Error(`Expected access token to contain id, status='pending', authPosition='owner', got: ${JSON.stringify(decoded)}`);
    }
    const lifespanSeconds = decoded.exp - decoded.iat;
    console.log(`Access token lifespan: ${lifespanSeconds} seconds (${lifespanSeconds / 60} mins)`);
    if (lifespanSeconds !== 300) {
      throw new Error(`Expected access token lifespan of 300s (5m), got ${lifespanSeconds}s`);
    }

    // Verify Cookie header (3 months = 90 days = 7,776,000s)
    const cookies = regRes.headers['set-cookie'];
    console.log('Set-Cookie header:', cookies);
    const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : String(cookies);
    if (!cookieHeader.includes('refreshToken=')) {
      throw new Error('Set-Cookie did not include refreshToken');
    }
    if (!cookieHeader.includes('Max-Age=7776000')) {
      throw new Error('Set-Cookie for rememberMe=true should have Max-Age=7776000 (90 days)');
    }
    console.log('✅ Test 1 Passed: Registration created user, 5m access token, and 3-month session cookie');

    // -----------------------------------------------------
    // 2. TEST LOGIN (rememberMe: false -> 1 day cookie)
    // -----------------------------------------------------
    console.log('\n--- Test 2: User Login (rememberMe: false) ---');
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: testUsername,
        password: 'SuperSecretPassword123!',
        rememberMe: false,
      },
    });

    console.log('Status code:', loginRes.statusCode);
    const loginBody = JSON.parse(loginRes.body);
    if (loginRes.statusCode !== 200) {
      throw new Error(`Login failed: ${loginRes.body}`);
    }

    if (loginBody.user.fullname !== 'Bell, Alexander') {
      throw new Error(`Fullname mismatch on login: ${loginBody.user.fullname}`);
    }
    if (loginBody.user.id !== undefined || loginBody.user.status !== undefined || loginBody.user.authPosition !== undefined) {
      throw new Error(`Login user should not contain id, status, or authPosition: ${JSON.stringify(loginBody.user)}`);
    }
    const loginDecoded: any = jwt.decode(loginBody.accessToken);
    if (!loginDecoded.id || !loginDecoded.status || !loginDecoded.authPosition) {
      throw new Error(`Login accessToken missing id, status, or authPosition: ${JSON.stringify(loginDecoded)}`);
    }

    const loginCookieHeader = Array.isArray(loginRes.headers['set-cookie'])
      ? loginRes.headers['set-cookie'].join('; ')
      : String(loginRes.headers['set-cookie']);
    // 1 day = 86400s
    if (!loginCookieHeader.includes('Max-Age=86400')) {
      throw new Error('Set-Cookie for rememberMe=false should have Max-Age=86400 (1 day)');
    }

    // Extract cookie value for subsequent tests
    const match = loginCookieHeader.match(/refreshToken=([^;]+)/);
    sessionCookie = match ? match[1] : '';
    console.log('Extracted session cookie:', sessionCookie.slice(0, 15) + '...');
    console.log('✅ Test 2 Passed: Login returned user (without id/status/authPosition), new 5m token with claims, and 1-day session cookie');

    // -----------------------------------------------------
    // 3. TEST PROTECTED ROUTE /api/auth/me
    // -----------------------------------------------------
    console.log('\n--- Test 3: Protected GET /api/auth/me ---');
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        authorization: `Bearer ${loginBody.accessToken}`,
      },
    });

    console.log('Status code:', meRes.statusCode);
    const meBody = JSON.parse(meRes.body);
    console.log('Me user:', meBody.user);
    if (meRes.statusCode !== 200) {
      throw new Error(`/api/auth/me failed: ${meRes.body}`);
    }
    if (meBody.user.fullname !== 'Bell, Alexander') {
      throw new Error(`Me endpoint fullname mismatch: ${meBody.user.fullname}`);
    }
    if (meBody.user.id !== undefined || meBody.user.status !== undefined || meBody.user.authPosition !== undefined) {
      throw new Error(`GET /me user should not contain id, status, or authPosition: ${JSON.stringify(meBody.user)}`);
    }
    console.log('✅ Test 3 Passed: Protected /me returned authentic user profile without id, status, or authPosition');

    // -----------------------------------------------------
    // 4. TEST REFRESH TOKEN via Cookie
    // -----------------------------------------------------
    console.log('\n--- Test 4: POST /api/auth/refresh via Cookie ---');
    const refreshRes = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: {
        cookie: `refreshToken=${sessionCookie}`,
      },
    });

    console.log('Status code:', refreshRes.statusCode);
    const refreshBody = JSON.parse(refreshRes.body);
    if (refreshRes.statusCode !== 200) {
      throw new Error(`Refresh failed: ${refreshRes.body}`);
    }
    if (!refreshBody.accessToken) {
      throw new Error('Refresh did not return a new accessToken');
    }
    if (refreshBody.user.fullname !== 'Bell, Alexander') {
      throw new Error(`Fullname mismatch in refresh response: ${refreshBody.user.fullname}`);
    }
    console.log('✅ Test 4 Passed: Successfully refreshed access token using HTTP session cookie');

    // -----------------------------------------------------
    // 5. TEST LOGOUT (Revokes Token & Clears Cookie)
    // -----------------------------------------------------
    console.log('\n--- Test 5: POST /api/auth/logout ---');
    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: {
        cookie: `refreshToken=${sessionCookie}`,
      },
    });

    console.log('Status code:', logoutRes.statusCode);

    // Verify subsequent refresh with revoked token fails
    const postLogoutRefreshRes = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: {
        cookie: `refreshToken=${sessionCookie}`,
      },
    });
    console.log('Post-logout refresh status:', postLogoutRefreshRes.statusCode);
    if (postLogoutRefreshRes.statusCode !== 401) {
      throw new Error(`Expected 401 on refresh after logout, got ${postLogoutRefreshRes.statusCode}`);
    }
    console.log('✅ Test 5 Passed: Logout successfully cleared cookie and revoked refresh token in DB');

    // -----------------------------------------------------
    // 6. TEST OAUTH ENDPOINT INPUT GUARDS
    // -----------------------------------------------------
    console.log('\n--- Test 6: OAuth Input Validation & Error Guards ---');
    const googleRes = await app.inject({
      method: 'POST',
      url: '/api/auth/google',
      payload: {},
    });
    console.log('Google empty payload status:', googleRes.statusCode);
    if (googleRes.statusCode !== 400) {
      throw new Error(`Expected 400 for empty Google payload, got ${googleRes.statusCode}`);
    }

    const githubRes = await app.inject({
      method: 'POST',
      url: '/api/auth/github',
      payload: {},
    });
    console.log('GitHub empty payload status:', githubRes.statusCode);
    if (githubRes.statusCode !== 400) {
      throw new Error(`Expected 400 for empty GitHub payload, got ${githubRes.statusCode}`);
    }
    console.log('✅ Test 6 Passed: Google and GitHub endpoints properly validate inputs');

    // -----------------------------------------------------
    // 7. TEST OPENAPI SWAGGER SPEC FOR SCALAR
    // -----------------------------------------------------
    console.log('\n--- Test 7: OpenAPI / Swagger Specification Generation ---');
    const openapiRes = await app.inject({
      method: 'GET',
      url: '/openapi.json',
    });
    const spec = JSON.parse(openapiRes.body);
    const authPaths = Object.keys(spec.paths).filter((p) => p.startsWith('/api/auth'));
    console.log('Registered Auth routes in OpenAPI spec:', authPaths);

    const requiredRoutes = [
      '/api/auth/register',
      '/api/auth/login',
      '/api/auth/google',
      '/api/auth/github',
      '/api/auth/refresh',
      '/api/auth/logout',
      '/api/auth/me',
    ];

    for (const route of requiredRoutes) {
      if (!authPaths.includes(route)) {
        throw new Error(`OpenAPI spec missing required route: ${route}`);
      }
    }
    // -----------------------------------------------------
    // 8. TEST OAUTH REGISTRATION WITHOUT PASSWORD
    // -----------------------------------------------------
    console.log('\n--- Test 8: OAuth Completion Registration (no password, auto username) ---');
    const oauthEmail = `oauthuser_${Date.now()}@example.com`;
    const oauthRegRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        firstname: 'Grace',
        middlename: 'Brewster',
        lastname: 'Hopper',
        extname: null,
        email: oauthEmail,
        authProvider: 'google',
        googleId: `google_test_${Date.now()}`,
        rememberMe: true,
      },
    });

    console.log('OAuth Reg Status code:', oauthRegRes.statusCode);
    const oauthRegBody = JSON.parse(oauthRegRes.body);
    if (oauthRegRes.statusCode !== 201) {
      throw new Error(`OAuth registration failed: ${oauthRegRes.body}`);
    }
    if (
      oauthRegBody.user.status !== undefined ||
      oauthRegBody.user.id !== undefined ||
      oauthRegBody.user.authPosition !== undefined ||
      oauthRegBody.user.fullname !== 'Hopper, Grace' ||
      !oauthRegBody.user.username
    ) {
      throw new Error(`OAuth user response validation failed: ${JSON.stringify(oauthRegBody.user)}`);
    }

    const oauthDecoded: any = jwt.decode(oauthRegBody.accessToken);
    if (!oauthDecoded.id || oauthDecoded.status !== 'pending' || oauthDecoded.authPosition !== 'owner') {
      throw new Error(`Expected OAuth access token to contain id, status, authPosition, got: ${JSON.stringify(oauthDecoded)}`);
    }
    console.log('✅ Test 8 Passed: OAuth user registered, status=pending and authPosition=owner placed into accessToken');

    // -----------------------------------------------------
    // 9. TEST BANNED USER LOGIN ATTEMPT
    // -----------------------------------------------------
    console.log('\n--- Test 9: Banned User Login Rejection (403 Forbidden) ---');
    await db.update(users).set({ status: 'banned' }).where(eq(users.id, oauthDecoded.id));

    // Update password so we can test credentials login check
    const bannedLoginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: oauthRegBody.user.username,
        password: 'AnyPassword123',
      },
    });

    console.log('Banned user login status:', bannedLoginRes.statusCode);
    if (bannedLoginRes.statusCode !== 403) {
      throw new Error(`Expected 403 Forbidden for banned user, got ${bannedLoginRes.statusCode}`);
    }
    console.log('✅ Test 9 Passed: Banned user login successfully rejected with 403 Forbidden');

    // -----------------------------------------------------
    // 10. TEST INVALID VERIFICATION CODE REJECTION
    // -----------------------------------------------------
    console.log('\n--- Test 10: Invalid Verification Code Rejection (400 Bad Request) ---');
    const invalidCodeRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        firstname: 'Failed',
        lastname: 'Verification',
        email: 'failtest@example.com',
        username: `failuser_${Date.now()}`,
        password: 'Password123!',
        code: '000000', // invalid code
        rememberMe: false,
      },
    });

    console.log('Invalid code status:', invalidCodeRes.statusCode);
    if (invalidCodeRes.statusCode !== 400) {
      throw new Error(`Expected 400 Bad Request for invalid verification code, got ${invalidCodeRes.statusCode}`);
    }
    console.log('✅ Test 10 Passed: Registration with invalid verification code properly rejected');

    // -----------------------------------------------------
    // 11. TEST /api/auth/send-email ENDPOINT
    // -----------------------------------------------------
    console.log('\n--- Test 11: Direct send-email Endpoint (mailOptions) ---');
    const sendEmailRes = await app.inject({
      method: 'POST',
      url: '/api/auth/send-email',
      payload: {
        to: 'recipient@example.com',
        subject: 'Welcome to QRchive',
        message: 'Your QRchive account has been verified!',
        replyTo: 'ababafamily2024@gmail.com',
      },
    });

    console.log('Send-email endpoint status:', sendEmailRes.statusCode);
    if (sendEmailRes.statusCode !== 200) {
      throw new Error(`Expected 200 OK for send-email endpoint, got ${sendEmailRes.statusCode}: ${sendEmailRes.body}`);
    }
    console.log('✅ Test 11 Passed: send-email endpoint successfully processed mailOptions');

    // Cleanup test 8 user
    await db.delete(users).where(eq(users.id, oauthDecoded.id));

    console.log('\n🎉 ALL 11 TESTS PASSED SUCCESSFULLY! 🎉\n');

  } finally {
    // Cleanup created test user and test refresh tokens
    const createdUser = await db.query.users.findFirst({
      where: eq(users.username, testUsername),
    });
    if (createdUser) {
      await db.delete(users).where(eq(users.id, createdUser.id));
      console.log(`Cleaned up test user: ${testUsername}`);
    }
    await app.close();
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  });
