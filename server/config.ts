import { homedir } from "node:os";
import { join } from "node:path";

const home = homedir();

const DEFAULT_HIDDEN = [
  // security-sensitive
  ".ssh",
  ".gnupg",
  ".aws",
  ".config/gh",
  ".config/sops",
  ".local/share/keyrings",
  // language/tool caches — like node_modules but for other ecosystems
  "node_modules",
  "go/pkg",          // Go module cache
  ".cargo/registry", // Rust crate cache
  ".rustup",
  ".nvm",
  ".bun/install",    // bun package cache
  ".npm",
  ".cache",
  ".mozilla",
  // VCS / build artifacts / generated output
  ".git",
  ".DS_Store",
  "__pycache__",
  ".mypy_cache",
  ".pytest_cache",
  "__snapshots__",
  "coverage",
  "dist",
  "dist-runtime",
  "build",
  "target",          // Rust/Java build output
  "vendor",          // vendored deps
  ".next",
  ".nuxt",
  "venv",
  ".venv",
].join(",");

function csv(value: string | undefined, fallback: string): string[] {
  return (value ?? fallback).split(",").map((s) => s.trim()).filter(Boolean);
}

export const config = {
  host: "127.0.0.1",
  port: Number(process.env.OPSDASH_PORT ?? 7890),
  openclawDir: process.env.OPENCLAW_HOME ?? join(home, ".openclaw"),
  get runsSqlitePath() {
    return join(this.openclawDir, "tasks", "runs.sqlite");
  },
  get flowsSqlitePath() {
    return join(this.openclawDir, "tasks", "flows", "registry.sqlite");
  },
  get cronJobsJsonPath() {
    return join(this.openclawDir, "cron", "jobs.json");
  },
  pullMe: {
    waitingOlderThanMs: 4 * 60 * 60 * 1000,
    cronConsecutiveFailureThreshold: 3,
  },
  pollIntervalMs: 1000,
  files: {
    root: process.env.OPSDASH_FILES_ROOT ?? home,
    hidden: [
      ...csv(process.env.OPSDASH_FILES_HIDDEN, DEFAULT_HIDDEN),
      ...csv(process.env.OPSDASH_FILES_HIDDEN_EXTRA, ""),
    ],
    block: csv(process.env.OPSDASH_FILES_BLOCK, ""),
    maxBytes: Number(process.env.OPSDASH_FILES_MAX_BYTES ?? 2_000_000),
  },
};
