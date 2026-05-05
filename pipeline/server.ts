// Tiny dev/self-hosted helper. Static deploy targets (GitHub Pages,
// bilko.run/projects/*) don't need this — they read public/data.json directly.
// But if you're running gitoverview off your own box and want a "refresh now"
// button, this gives you a /dashboard/update endpoint that spawns `pnpm sync`
// and SSE-streams the output back.
//
//   $ pnpm serve              # listens on :5174
//   $ curl -X POST http://localhost:5174/dashboard/update
//   $ curl http://localhost:5174/pipeline/status

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = dirname(dirname(__filename));
const PORT = Number(process.env.PORT ?? 5174);

let inFlight: Promise<void> | null = null;

function cors(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function handleStatus(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const raw = await readFile(join(root, 'public', 'data.json'), 'utf8');
    const data = JSON.parse(raw) as { pipeline: unknown };
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ pipeline: data.pipeline }));
  } catch (err) {
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
  }
}

function handleUpdate(_req: IncomingMessage, res: ServerResponse): void {
  if (inFlight) {
    res.writeHead(409, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'sync already in progress' }));
    return;
  }
  res.writeHead(202, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
  });
  res.write(`event: start\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);

  inFlight = new Promise<void>((resolve) => {
    const child = spawn('pnpm', ['sync'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    child.stdout?.on('data', (chunk: Buffer) => {
      for (const line of chunk.toString('utf8').split('\n')) {
        if (line) send('log', { line });
      }
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      for (const line of chunk.toString('utf8').split('\n')) {
        if (line) send('log', { line, stream: 'err' });
      }
    });
    child.on('exit', (code) => {
      send('done', { code });
      res.end();
      inFlight = null;
      resolve();
    });
    child.on('error', (err) => {
      send('error', { message: err.message });
      res.end();
      inFlight = null;
      resolve();
    });
  });
}

const server = createServer((req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method === 'GET' && req.url === '/pipeline/status') {
    void handleStatus(req, res);
    return;
  }
  if (req.method === 'POST' && req.url === '/dashboard/update') {
    handleUpdate(req, res);
    return;
  }
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, () => {
  console.log(`gitoverview server listening on http://localhost:${PORT}`);
  console.log('  GET  /pipeline/status      — current sync metadata');
  console.log('  POST /dashboard/update     — re-run pnpm sync (SSE log)');
});
