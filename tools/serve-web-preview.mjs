import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(projectRoot, process.argv[2] ?? 'build/web-mobile');
const HOST = '127.0.0.1';
const PORT = Number(process.argv[3] ?? 7457);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm' };
const server = http.createServer((req, res) => {
    let requested;
    try { requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400).end(); return; }
    const target = path.resolve(root, '.' + (requested === '/' ? '/index.html' : requested));
    if (!target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.stat(target, (error, stat) => {
        if (error || !stat.isFile()) { res.writeHead(404).end(); return; }
        res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        fs.createReadStream(target).pipe(res);
    });
});

server.on('error', error => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Preview port ${PORT} is already in use.`);
        process.exitCode = 1;
        return;
    }
    throw error;
});

server.listen(PORT, HOST, () => console.log(`Web preview: http://${HOST}:${PORT}/`));
