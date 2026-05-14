import { promises as fs } from "node:fs";
import path from "node:path";
import { config } from "./config.ts";

const TEXT_EXT_ALLOWLIST = new Set([
  ".md",
  ".markdown",
  ".mdx",
  ".txt",
  ".log",
  ".json",
  ".jsonc",
  ".jsonl",
  ".ndjson",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".css",
  ".scss",
  ".less",
  ".html",
  ".htm",
  ".xml",
  ".svg",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".conf",
  ".env",
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".py",
  ".rb",
  ".rs",
  ".go",
  ".java",
  ".kt",
  ".swift",
  ".c",
  ".h",
  ".cc",
  ".cpp",
  ".hpp",
  ".cs",
  ".php",
  ".sql",
  ".graphql",
  ".gql",
  ".lua",
  ".dockerfile",
  ".gitignore",
  ".gitattributes",
  ".editorconfig",
  ".prettierrc",
  ".eslintrc",
]);

const TEXT_BASENAME_ALLOWLIST = new Set([
  "Dockerfile",
  "Makefile",
  "Procfile",
  "Caddyfile",
  "Brewfile",
  "Gemfile",
  "Rakefile",
  "LICENSE",
  "README",
  "CHANGELOG",
  "AUTHORS",
  "CONTRIBUTORS",
  "TODO",
]);

export type SafePath = {
  rel: string; // posix-style relative path under root
  abs: string; // realpath-resolved absolute path
};

export class FileSafetyError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let cachedRoot: string | null = null;

async function getRealRoot(): Promise<string> {
  if (cachedRoot) return cachedRoot;
  cachedRoot = await fs.realpath(config.files.root);
  return cachedRoot;
}

function normalizeRel(input: string | undefined | null): string {
  const raw = (input ?? "").trim();
  // strip leading slashes; treat empty as root
  const stripped = raw.replace(/^\/+/, "");
  // posix normalize and reject explicit `..` segments
  const norm = path.posix.normalize(stripped || ".");
  if (norm === "." || norm === "./") return "";
  if (norm.split("/").some((seg) => seg === "..")) {
    throw new FileSafetyError("path escapes root", 403);
  }
  return norm;
}

function inBlocklist(rel: string): boolean {
  if (!config.files.block.length) return false;
  // block patterns match path prefix segments (e.g. ".ssh" blocks ".ssh/anything")
  for (const pat of config.files.block) {
    const p = pat.replace(/^\/+|\/+$/g, "");
    if (!p) continue;
    if (rel === p || rel.startsWith(`${p}/`)) return true;
  }
  return false;
}

function isHidden(rel: string, name: string): boolean {
  if (name.startsWith(".")) return true;
  for (const pat of config.files.hidden) {
    const p = pat.replace(/^\/+|\/+$/g, "");
    if (!p) continue;
    if (rel === p || rel.startsWith(`${p}/`) || name === p) return true;
  }
  return false;
}

export async function resolveSafe(relInput: string | undefined | null, mustExist = true): Promise<SafePath> {
  const rel = normalizeRel(relInput);
  if (inBlocklist(rel)) {
    throw new FileSafetyError("path is blocked", 403);
  }
  const root = await getRealRoot();
  const target = path.resolve(root, rel);

  if (mustExist) {
    let real: string;
    try {
      real = await fs.realpath(target);
    } catch {
      throw new FileSafetyError("not found", 404);
    }
    if (real !== root && !real.startsWith(root + path.sep)) {
      throw new FileSafetyError("path escapes root", 403);
    }
    return { rel, abs: real };
  }

  // For create operations: verify parent exists and is inside root, but target may not exist
  const parent = path.dirname(target);
  let realParent: string;
  try {
    realParent = await fs.realpath(parent);
  } catch {
    throw new FileSafetyError("parent not found", 404);
  }
  if (realParent !== root && !realParent.startsWith(root + path.sep)) {
    throw new FileSafetyError("path escapes root", 403);
  }
  const abs = path.join(realParent, path.basename(target));
  return { rel, abs };
}

export type DirEntry = {
  name: string;
  kind: "dir" | "file";
  size?: number;
  mtime?: number;
  hidden: boolean;
  binary?: boolean;
};

function isProbablyText(entryName: string): boolean {
  const lower = entryName.toLowerCase();
  const ext = path.extname(lower);
  if (ext && TEXT_EXT_ALLOWLIST.has(ext)) return true;
  if (TEXT_BASENAME_ALLOWLIST.has(entryName)) return true;
  // dotfiles without extension that are configs (.bashrc etc.) — consider text
  if (entryName.startsWith(".") && !ext) return true;
  return false;
}

export async function listDir(relInput: string | undefined, showHidden = false): Promise<{
  path: string;
  entries: DirEntry[];
}> {
  const safe = await resolveSafe(relInput);
  const st = await fs.stat(safe.abs);
  if (!st.isDirectory()) {
    throw new FileSafetyError("not a directory", 400);
  }
  const names = await fs.readdir(safe.abs);
  const entries: DirEntry[] = [];
  for (const name of names) {
    const childRel = safe.rel ? path.posix.join(safe.rel, name) : name;
    const hidden = isHidden(childRel, name);
    if (hidden && !showHidden) continue;
    if (inBlocklist(childRel)) continue;
    const childAbs = path.join(safe.abs, name);
    let cs;
    try {
      cs = await fs.lstat(childAbs);
    } catch {
      continue;
    }
    // Skip symlinks entirely to avoid leaking outside root via tree traversal
    if (cs.isSymbolicLink()) continue;
    if (cs.isDirectory()) {
      entries.push({ name, kind: "dir", mtime: cs.mtimeMs, hidden });
    } else if (cs.isFile()) {
      entries.push({
        name,
        kind: "file",
        size: cs.size,
        mtime: cs.mtimeMs,
        hidden,
        binary: !isProbablyText(name),
      });
    }
  }
  // dirs first, then alpha
  entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return { path: safe.rel, entries };
}

export type FileContent =
  | {
      path: string;
      content: string;
      encoding: "utf8";
      size: number;
      mtime: number;
      language?: string;
    }
  | {
      path: string;
      size: number;
      mtime: number;
      error: "binary" | "too_large";
    };

export async function readFileText(relInput: string): Promise<FileContent> {
  const safe = await resolveSafe(relInput);
  const st = await fs.stat(safe.abs);
  if (!st.isFile()) throw new FileSafetyError("not a file", 400);
  const base = path.basename(safe.abs);
  if (!isProbablyText(base)) {
    return { path: safe.rel, size: st.size, mtime: st.mtimeMs, error: "binary" };
  }
  if (st.size > config.files.maxBytes) {
    return { path: safe.rel, size: st.size, mtime: st.mtimeMs, error: "too_large" };
  }
  const content = await fs.readFile(safe.abs, "utf8");
  return {
    path: safe.rel,
    content,
    encoding: "utf8",
    size: st.size,
    mtime: st.mtimeMs,
    language: detectLanguage(safe.rel),
  };
}

export async function writeFileText(
  relInput: string,
  content: string,
  expectedMtime?: number,
): Promise<{ path: string; mtime: number; size: number }> {
  const safe = await resolveSafe(relInput, false);

  if (expectedMtime !== undefined) {
    let currentMtime: number | null = null;
    try {
      currentMtime = (await fs.stat(safe.abs)).mtimeMs;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
    if (currentMtime !== null && Math.abs(currentMtime - expectedMtime) > 1) {
      throw new FileSafetyError("mtime mismatch", 409);
    }
  }

  await fs.mkdir(path.dirname(safe.abs), { recursive: true });
  await fs.writeFile(safe.abs, content, "utf8");
  const after = await fs.stat(safe.abs);
  return { path: safe.rel, mtime: after.mtimeMs, size: after.size };
}

export async function makeDir(relInput: string): Promise<{ path: string; mtime: number }> {
  const safe = await resolveSafe(relInput, false);
  await fs.mkdir(safe.abs, { recursive: true });
  const st = await fs.stat(safe.abs);
  return { path: safe.rel, mtime: st.mtimeMs };
}

export async function renamePath(
  fromInput: string,
  toInput: string,
): Promise<{ from: string; to: string }> {
  const from = await resolveSafe(fromInput);
  const to = await resolveSafe(toInput, false);
  await fs.rename(from.abs, to.abs);
  return { from: from.rel, to: to.rel };
}

export async function deletePath(relInput: string): Promise<{ path: string }> {
  const safe = await resolveSafe(relInput);
  const st = await fs.stat(safe.abs);
  if (st.isDirectory()) {
    await fs.rm(safe.abs, { recursive: true, force: false });
  } else {
    await fs.unlink(safe.abs);
  }
  return { path: safe.rel };
}

export function getFilesRoot(): string {
  return config.files.root;
}

export function getMaxBytes(): number {
  return config.files.maxBytes;
}

export async function findFiles(maxCount = 20_000): Promise<{ files: string[] }> {
  const root = await getRealRoot();
  const results: string[] = [];

  async function walk(absDir: string, relDir: string, depth: number): Promise<void> {
    if (depth > 12 || results.length >= maxCount) return;
    let names: string[];
    try {
      names = await fs.readdir(absDir);
    } catch {
      return;
    }
    for (const name of names) {
      if (results.length >= maxCount) break;
      const childRel = relDir ? `${relDir}/${name}` : name;
      if (inBlocklist(childRel) || isHidden(childRel, name)) continue;
      const childAbs = path.join(absDir, name);
      let st;
      try {
        st = await fs.lstat(childAbs);
      } catch {
        continue;
      }
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) {
        await walk(childAbs, childRel, depth + 1);
      } else if (st.isFile()) {
        results.push(childRel);
      }
    }
  }

  await walk(root, "", 0);
  results.sort();
  return { files: results };
}

export type SearchResult = { path: string; line: number; snippet: string };

export async function searchFiles(
  query: string,
  maxResults = 200,
): Promise<{ results: SearchResult[] }> {
  if (!query.trim()) return { results: [] };
  const root = await getRealRoot();

  // rg: skips hidden dirs/files by default, respects .gitignore, much faster than grep
  // Add explicit glob ignores for known noisy dirs that aren't hidden (dotfile)
  const ignoreGlobs = config.files.hidden
    .filter((p) => !p.startsWith("."))
    .flatMap((name) => ["-g", `!${name}`]);

  const proc = Bun.spawn(
    ["rg", "-n", "--no-heading", "-S", ...ignoreGlobs, "--", query, "."],
    { cwd: root, stdout: "pipe", stderr: "pipe" },
  );

  const raw = await new Response(proc.stdout).text();
  const results: SearchResult[] = [];

  for (const rawLine of raw.split("\n")) {
    if (!rawLine || results.length >= maxResults) break;
    // rg --no-heading format: path:linenum:content (absolute or relative path)
    const colon1 = rawLine.indexOf(":");
    if (colon1 === -1) continue;
    const colon2 = rawLine.indexOf(":", colon1 + 1);
    if (colon2 === -1) continue;
    const rawPath = rawLine.slice(0, colon1);
    const lineNum = parseInt(rawLine.slice(colon1 + 1, colon2), 10);
    const snippet = rawLine.slice(colon2 + 1).trim().slice(0, 140);
    if (isNaN(lineNum) || !rawPath) continue;
    // Make path relative to root (rg may return relative or absolute)
    const filePart = rawPath.startsWith(root)
      ? rawPath.slice(root.length).replace(/^\//, "")
      : rawPath.replace(/^\.\//, "");
    if (!filePart) continue;
    results.push({ path: filePart, line: lineNum, snippet });
  }

  return { results };
}

function detectLanguage(rel: string): string | undefined {
  const lower = rel.toLowerCase();
  const ext = path.extname(lower);
  const base = path.basename(lower);
  const map: Record<string, string> = {
    ".md": "markdown",
    ".markdown": "markdown",
    ".mdx": "markdown",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".json": "json",
    ".jsonc": "json",
    ".jsonl": "json",
    ".ndjson": "json",
    ".css": "css",
    ".scss": "scss",
    ".less": "less",
    ".html": "html",
    ".htm": "html",
    ".xml": "xml",
    ".svg": "xml",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".toml": "ini",
    ".ini": "ini",
    ".conf": "ini",
    ".env": "shell",
    ".sh": "shell",
    ".bash": "shell",
    ".zsh": "shell",
    ".fish": "shell",
    ".py": "python",
    ".rb": "ruby",
    ".rs": "rust",
    ".go": "go",
    ".java": "java",
    ".kt": "kotlin",
    ".swift": "swift",
    ".c": "c",
    ".h": "c",
    ".cc": "cpp",
    ".cpp": "cpp",
    ".hpp": "cpp",
    ".cs": "csharp",
    ".php": "php",
    ".sql": "sql",
    ".graphql": "graphql",
    ".gql": "graphql",
    ".lua": "lua",
  };
  if (map[ext]) return map[ext];
  if (base === "dockerfile") return "dockerfile";
  if (base === "makefile") return "makefile";
  return undefined;
}
