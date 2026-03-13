/**
 * bun_server.js — Servidor local de desenvolvimento
 * 
 * Serve arquivos estáticos de public/ na porta 8888
 * Faz proxy de /api/* para o FastAPI Python na porta 8001
 * 
 * Uso: bun run bun_server.js
 */

import { serve } from "bun";
import { join } from "path";
import { readFileSync, existsSync } from "fs";

const BUN_PORT = parseInt(process.env.BUN_PORT || "8888");
const API_PORT = parseInt(process.env.API_PORT || "8001");
const FASTAPI_BASE = `http://localhost:${API_PORT}`;
const PUBLIC_DIR = join(import.meta.dir, "public");

const MIME_TYPES = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
};

function getMimeType(path) {
    const ext = path.match(/\.[^.]+$/)?.[0] || "";
    return MIME_TYPES[ext] || "application/octet-stream";
}

serve({
    port: BUN_PORT,
    async fetch(req) {
        const url = new URL(req.url);
        const path = url.pathname;

        // ─── Proxy para FastAPI ─────────────────────────────────────────────────
        if (path.startsWith("/api/")) {
            const target = `${FASTAPI_BASE}${path}${url.search}`;
            try {
                const proxyRes = await fetch(target, {
                    method: req.method,
                    headers: req.headers,
                    body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
                });
                return new Response(proxyRes.body, {
                    status: proxyRes.status,
                    headers: proxyRes.headers,
                });
            } catch (err) {
                console.error(`[proxy error] ${target}:`, err.message);
                return new Response(
                    JSON.stringify({ error: "FastAPI unreachable", detail: err.message }),
                    { status: 502, headers: { "Content-Type": "application/json" } }
                );
            }
        }

        // ─── Serve arquivos estáticos de public/ ───────────────────────────────
        let filePath = join(PUBLIC_DIR, path === "/" ? "index.html" : path);

        // fallback: tenta com .html
        if (!existsSync(filePath) && !path.includes(".")) {
            filePath = join(PUBLIC_DIR, path + ".html");
        }

        if (existsSync(filePath)) {
            const file = readFileSync(filePath);
            const mime = getMimeType(filePath);
            return new Response(file, {
                headers: { "Content-Type": mime },
            });
        }

        return new Response("404 Not Found", { status: 404 });
    },
});

console.log(`
╔══════════════════════════════════════════╗
║  MVPCO Dev Server                        ║
║  Frontend: http://localhost:${BUN_PORT}        ║
║  Proxy /api/* → localhost:${API_PORT}         ║
╚══════════════════════════════════════════╝
`);
