import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const workoutId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const mock = createServer((req, res) => {
  res.setHeader('content-type', 'application/json');
  if (req.url.startsWith('/auth/v1/user')) return res.end(JSON.stringify({ id: userId, aud: 'authenticated', email: 'test@example.com' }));
  if (req.url.startsWith('/rest/v1/profiles')) return res.end(JSON.stringify({ role: 'admin' }));
  if (req.url.startsWith('/rest/v1/workouts')) return res.end(JSON.stringify({ id: workoutId }));
  res.statusCode = 404;
  res.end('{}');
});

const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
await listen(mock);
const mockPort = mock.address().port;
const reservation = createServer();
await listen(reservation);
const workerPort = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const temp = await mkdtemp(path.join(tmpdir(), 'mirian-upload-smoke-'));
const worker = spawn(process.execPath, ['server.js'], {
  cwd: import.meta.dirname,
  env: {
    ...process.env,
    SUPABASE_URL: `http://127.0.0.1:${mockPort}`,
    SUPABASE_SERVICE_ROLE: 'test-key',
    SIGNING_SECRET: 'test-signing-secret',
    VIDEO_DIR: path.join(temp, 'videos'),
    TMP_DIR: path.join(temp, 'tmp'),
    PORT: String(workerPort),
  },
  stdio: 'ignore',
});

const base = `http://127.0.0.1:${workerPort}`;
const headers = { Authorization: 'Bearer test-token' };
try {
  let healthy = false;
  for (let i = 0; i < 40; i++) {
    try {
      const response = await fetch(`${base}/health`);
      healthy = response.ok;
      if (healthy) break;
    } catch { /* server starting */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(healthy, 'worker did not start');

  const init = await fetch(`${base}/upload/init`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ workout_id: workoutId, file_size: 12 }),
  });
  const initText = await init.text();
  assert.equal(init.status, 201, initText);
  const { upload_id: uploadId } = JSON.parse(initText);
  const chunk = (offset, value) => fetch(`${base}/upload/${uploadId}/chunk`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/octet-stream', 'X-Upload-Offset': String(offset) },
    body: Buffer.from(value),
  });

  let response = await chunk(0, 'hello ');
  assert.equal(response.status, 200, await response.text());
  response = await fetch(`${base}/upload/${uploadId}`, { headers });
  assert.equal((await response.json()).received_bytes, 6);
  response = await chunk(0, 'world!');
  assert.equal(response.status, 409, await response.text());
  response = await chunk(6, 'world!');
  assert.equal(response.status, 200, await response.text());
  response = await fetch(`${base}/upload/${uploadId}`, { headers });
  assert.equal((await response.json()).received_bytes, 12);
  assert.equal(await readFile(path.join(temp, 'tmp', `${uploadId}.part`), 'utf8'), 'hello world!');
  console.log('Upload em partes, retomada e rejeição de offset incorreto: OK');
} finally {
  if (worker.exitCode === null) {
    worker.kill();
    await new Promise((resolve) => worker.once('exit', resolve));
  }
  await new Promise((resolve) => mock.close(resolve));
  await rm(temp, { recursive: true, force: true });
}
