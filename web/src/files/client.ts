export type DirEntry = {
  name: string;
  kind: "dir" | "file";
  size?: number;
  mtime?: number;
  hidden: boolean;
  binary?: boolean;
};

export type DirListing = {
  path: string;
  entries: DirEntry[];
};

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

export type FilesConfig = { root: string; maxBytes: number };

async function ok<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = `${res.status} · ${j.error}`;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export async function fetchFilesConfig(): Promise<FilesConfig> {
  return ok<FilesConfig>(await fetch("/api/files/config"));
}

export async function fetchTree(path: string, showHidden = false): Promise<DirListing> {
  const qs = new URLSearchParams({ path });
  if (showHidden) qs.set("showHidden", "1");
  return ok<DirListing>(await fetch(`/api/files/tree?${qs}`));
}

export async function fetchContent(path: string): Promise<FileContent> {
  const qs = new URLSearchParams({ path });
  return ok<FileContent>(await fetch(`/api/files/content?${qs}`));
}

export async function saveContent(
  path: string,
  content: string,
  expectedMtime?: number,
): Promise<{ path: string; mtime: number; size: number }> {
  const res = await fetch("/api/files/content", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path, content, expectedMtime }),
  });
  return ok(res);
}

export async function mkdir(path: string): Promise<{ path: string; mtime: number }> {
  const res = await fetch("/api/files/mkdir", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path }),
  });
  return ok(res);
}

export async function rename(from: string, to: string): Promise<{ from: string; to: string }> {
  const res = await fetch("/api/files/rename", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ from, to }),
  });
  return ok(res);
}

export async function deletePath(path: string): Promise<{ path: string }> {
  const qs = new URLSearchParams({ path });
  const res = await fetch(`/api/files?${qs}`, { method: "DELETE" });
  return ok(res);
}

export function basename(p: string): string {
  if (!p) return "/";
  const i = p.lastIndexOf("/");
  return i === -1 ? p : p.slice(i + 1);
}

export function dirname(p: string): string {
  if (!p) return "";
  const i = p.lastIndexOf("/");
  return i === -1 ? "" : p.slice(0, i);
}

export function joinPath(...parts: string[]): string {
  return parts.filter(Boolean).join("/").replace(/\/+/g, "/");
}

export async function findAllFiles(): Promise<{ files: string[] }> {
  return ok<{ files: string[] }>(await fetch("/api/files/find"));
}

export type SearchResult = { path: string; line: number; snippet: string };

export async function searchContent(q: string): Promise<{ results: SearchResult[] }> {
  const qs = new URLSearchParams({ q });
  return ok<{ results: SearchResult[] }>(await fetch(`/api/files/search?${qs}`));
}

export function isMarkdown(p: string): boolean {
  const lower = p.toLowerCase();
  return lower.endsWith(".md") || lower.endsWith(".markdown") || lower.endsWith(".mdx");
}
