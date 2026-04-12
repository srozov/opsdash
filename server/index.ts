import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve, extname } from "node:path";
import { listTasks, getTask } from "./tasks.ts";
import { listTaskFlows, getTaskFlow } from "./taskflows.ts";
import { listCronJobs, getCronJob } from "./cron-jobs.ts";
import { startEventLoop, getSnapshot, subscribe } from "./events.ts";
import { config } from "./config.ts";

const app = new Hono();

app.get("/api/tasks", (c) => {
  const runtime = c.req.query("runtime");
  const agent = c.req.query("agent");
  const parentCronJobId = c.req.query("cronJob");
  let tasks = listTasks();
  if (runtime) tasks = tasks.filter((t) => t.runtime === runtime);
  if (agent) tasks = tasks.filter((t) => t.agentId === agent);
  if (parentCronJobId) tasks = tasks.filter((t) => t.parentCronJobId === parentCronJobId);
  return c.json({ tasks });
});

app.get("/api/tasks/:id", (c) => {
  const task = getTask(c.req.param("id"));
  if (!task) return c.json({ error: "not found" }, 404);
  return c.json({ task });
});

app.get("/api/taskflows", (c) => {
  return c.json({ flows: listTaskFlows() });
});

app.get("/api/taskflows/:id", (c) => {
  const flow = getTaskFlow(c.req.param("id"));
  if (!flow) return c.json({ error: "not found" }, 404);
  return c.json({ flow });
});

app.get("/api/cron-jobs", (c) => {
  return c.json({ cronJobs: listCronJobs() });
});

app.get("/api/cron-jobs/:id", (c) => {
  const job = getCronJob(c.req.param("id"));
  if (!job) return c.json({ error: "not found" }, 404);
  return c.json({ cronJob: job });
});

app.get("/api/snapshot", (c) => c.json(getSnapshot()));

app.get("/api/events", (c) => {
  return streamSSE(c, async (stream) => {
    await stream.writeSSE({
      event: "snapshot",
      data: JSON.stringify(getSnapshot()),
    });
    let closed = false;
    const unsub = subscribe((snapshot) => {
      if (closed) return;
      stream
        .writeSSE({ event: "snapshot", data: JSON.stringify(snapshot) })
        .catch(() => {});
    });
    stream.onAbort(() => {
      closed = true;
      unsub();
    });
    while (!closed) {
      await stream.sleep(15000);
      if (closed) break;
      await stream.writeSSE({ event: "ping", data: String(Date.now()) });
    }
  });
});

const publicDir = resolve(import.meta.dir, "public");
const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".map": "application/json",
};

app.get("*", (c) => {
  const url = new URL(c.req.url);
  let pathname = url.pathname;
  if (pathname === "/") pathname = "/index.html";
  const filePath = join(publicDir, pathname);
  if (
    !filePath.startsWith(publicDir) ||
    !existsSync(filePath) ||
    !statSync(filePath).isFile()
  ) {
    const indexPath = join(publicDir, "index.html");
    if (existsSync(indexPath)) {
      return new Response(readFileSync(indexPath), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    return c.text("opsdash UI not built yet — run `bun run build`", 503);
  }
  const ext = extname(filePath);
  return new Response(readFileSync(filePath), {
    headers: { "content-type": mime[ext] ?? "application/octet-stream" },
  });
});

startEventLoop();

const server = Bun.serve({
  hostname: config.host,
  port: config.port,
  fetch: app.fetch,
});

console.log(`[opsdash] listening on http://${server.hostname}:${server.port}`);
