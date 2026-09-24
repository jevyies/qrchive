import { buildApp } from '../src/server';

async function main() {
  const app = await buildApp();
  const address = await app.listen({ port: 0, host: '127.0.0.1' });
  const port = (app.server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`Server started on ${baseUrl}`);

  const testPath = '/cdn-cgi/image/width=500,quality=80,format=auto/api/photos/view/dev/events/55deea6d/2d837d1b/2/1790154216816_775547ec_2d837d1b_1790154216802.jpg';
  console.log(`Testing GET ${baseUrl}${testPath}`);

  const res = await fetch(`${baseUrl}${testPath}`, { redirect: 'manual' });
  console.log(`Status: ${res.status} ${res.statusText}`);
  if (res.headers.get('location')) {
    console.log(`Redirect Location: ${res.headers.get('location')}`);
  }

  await app.close();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
