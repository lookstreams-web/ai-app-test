import { createServer, type Server } from "node:http";
import type { AnalysisRepository } from "./repository.js";

export function createHealthServer(repository: AnalysisRepository, isWorkerStarted: () => boolean): Server {
  return createServer(async (request, response) => {
    response.setHeader("content-type", "application/json; charset=utf-8");
    if (request.method !== "GET") {
      response.writeHead(405).end(JSON.stringify({ ok: false, error: "method_not_allowed" }));
      return;
    }
    if (request.url === "/health") {
      response.writeHead(200).end(JSON.stringify({ ok: true }));
      return;
    }
    if (request.url === "/ready") {
      const databaseReady = await repository.isReady().catch(() => false);
      const ready = databaseReady && isWorkerStarted();
      response.writeHead(ready ? 200 : 503).end(JSON.stringify({ ok: ready, worker: isWorkerStarted(), database: databaseReady }));
      return;
    }
    response.writeHead(404).end(JSON.stringify({ ok: false, error: "not_found" }));
  });
}
