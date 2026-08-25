/**
 * Conformance auditor for the w6w app pack.
 *
 * Checks every app under `apps/` against the *current* spec — the validator and
 * types in `core` (`@w6w/validator`, `@w6w/types`), the loader's manifest
 * resolution rules, and the hard sandbox rules from `core/docs/build-a-w6w-app.md`.
 *
 * It is deliberately static + import-based rather than a full `loadApp()`:
 *   - manifest identity is rebuilt exactly the way `runtime/src/loader.ts` does,
 *     then run through `validateApp` + `unknownCategories`;
 *   - behavior is read by importing each app's `index.ts` (they are first-party,
 *     so no sandbox needed) and running `validateAction` / `validateAuth`;
 *   - the sandbox rules that can only be seen in source (global `fetch`, `Deno.*`,
 *     credentials in actions, undeclared egress hosts) are caught by a source scan.
 *
 *   deno run --no-check -A _tools/audit.ts [--json] [app ...]
 */
import {
  unknownCategories,
  validateAction,
  validateApp,
  validateAuth,
} from "../../core/packages/validator/mod.ts";
import { hostAllowed } from "@w6w/runtime";
import { TILE, verdictFor } from "./icon-legibility.ts";

const ROOT = new URL("../", import.meta.url).pathname.replace(/\/$/, "");
const APPS_DIR = `${ROOT}/apps`;

type Severity = "error" | "warn";
interface Issue {
  severity: Severity;
  check: string;
  path: string;
  message: string;
}

// ---------------------------------------------------------------- manifest --

/** Mirror of `runtime/src/loader.ts#manifestFromPackageJson` (identity resolution). */
function manifestFromPackageJson(pkg: Record<string, any>): Record<string, unknown> {
  const w = pkg.w6w ?? {};
  const unscoped = (n?: string) => (n ? n.slice(n.lastIndexOf("/") + 1) : undefined);
  const author = typeof pkg.author === "string" ? { name: pkg.author } : pkg.author;
  return {
    manifestVersion: w.manifestVersion ?? "1",
    id: w.id,
    name: w.name ?? unscoped(pkg.name),
    displayName: w.displayName,
    version: w.version ?? pkg.version,
    description: w.description ?? pkg.description ?? "",
    categories: w.categories ?? pkg.categories,
    appearance: w.appearance,
    author: w.author ?? author,
    license: w.license ?? pkg.license,
    network: w.network,
  };
}

// ------------------------------------------------------------ source rules --

/** Relative imports must keep their `.ts` extension (rule: build-a-w6w-app.md). */
const RE_REL_IMPORT = /from\s+["'](\.\.?\/[^"']+)["']/g;
/** A bare `fetch(` call — anything not reached through `ctx.` (or a local alias). */
const RE_BARE_FETCH = /(^|[^.\w])fetch\s*\(/;
/** Host-denied globals inside the action sandbox. */
const RE_DENIED_GLOBAL = /\b(Deno\.[A-Za-z]|XMLHttpRequest|process\.env)\b/;
/** `import ... from "node:..."` — denied in the sandbox. */
const RE_NODE_IMPORT = /from\s+["']node:/;
/** An absolute https URL literal — used to derive the real egress host set. */
const RE_URL_LITERAL = /https:\/\/([a-z0-9.-]+\.[a-z]{2,})(?=[/"'`\s)]|$)/gi;
/** Writing an auth header — only legal inside `auth/` (the `sign` hook). */
const RE_AUTH_HEADER = /["'`]?authorization["'`]?\s*[\]:=]/i;

/** Remove `/* *​/` and `//` comments so scans only see executable code. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

function walk(dir: string): string[] {
  const out: string[] = [];
  let entries: Deno.DirEntry[];
  try {
    entries = [...Deno.readDirSync(dir)];
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory) out.push(...walk(p));
    else if (e.name.endsWith(".ts")) out.push(p);
  }
  return out;
}

function scanSources(appDir: string, allow: string[], oauthHosts: string[]): Issue[] {
  const issues: Issue[] = [];
  const allowed = new Set([...allow, ...oauthHosts]);
  const seenHosts = new Map<string, string>(); // host -> first file that used it

  for (const sub of ["actions", "auth", "lib", "triggers"]) {
    for (const file of walk(`${appDir}/${sub}`)) {
      const rel = file.slice(appDir.length + 1);
      const src = Deno.readTextFileSync(file);
      const lines = src.split("\n");

      for (const [i, line] of lines.entries()) {
        const at = `${rel}:${i + 1}`;
        // Skip comments — prose mentions of `fetch`/hosts are not code.
        const code = line.replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, "");
        if (!code.trim()) continue;

        if (RE_BARE_FETCH.test(code) && !/\bctx\.fetch|typeof fetch|fetch:/.test(code)) {
          issues.push({
            severity: "error",
            check: "sandbox/global-fetch",
            path: at,
            message: "calls global `fetch` — the sandbox denies it; use `ctx.fetch`",
          });
        }
        if (RE_DENIED_GLOBAL.test(code)) {
          issues.push({
            severity: "error",
            check: "sandbox/denied-global",
            path: at,
            message: `uses a sandbox-denied global: ${code.trim().slice(0, 80)}`,
          });
        }
        if (RE_NODE_IMPORT.test(code)) {
          issues.push({
            severity: "error",
            check: "sandbox/node-import",
            path: at,
            message: "imports a `node:` builtin — denied in the sandbox",
          });
        }
        if (sub !== "auth" && RE_AUTH_HEADER.test(code) && !/\/\//.test(line)) {
          issues.push({
            severity: "error",
            check: "credentials/leak",
            path: at,
            message:
              "sets an Authorization header outside `auth/` — only the `sign` hook may touch credentials",
          });
        }
      }

      for (const m of src.matchAll(RE_REL_IMPORT)) {
        if (!m[1].endsWith(".ts") && !m[1].endsWith(".json")) {
          issues.push({
            severity: "error",
            check: "imports/extension",
            path: rel,
            message: `relative import \`${m[1]}\` is missing its \`.ts\` extension`,
          });
        }
      }

      // Egress hosts are read from code only. URLs inside comments (source
      // attribution, doc links) and inside user-facing `hint:` / `description:`
      // prose are documentation, not requests.
      const codeOnly = stripComments(src)
        .replace(/\b(?:hint|description|placeholder|label|title|subtitle):\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)(?:\s*\+\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`))*/g, "");
      for (const m of codeOnly.matchAll(RE_URL_LITERAL)) {
        if (!seenHosts.has(m[1])) seenHosts.set(m[1], rel);
      }
    }
  }

  for (const [host, file] of seenHosts) {
    // Same predicate the sandbox enforces at run time — a `"*.apex"` allow
    // entry covers subdomains (never the bare apex) and a bare `*` covers
    // everything. `hostAllowed()` lowercases each allow entry but assumes the
    // host is already lowercase (true at run time, where it comes off
    // `new URL().hostname`); the host here is scraped from source text and
    // can be mixed case, so it is lowercased at this call site.
    const covered = hostAllowed([...allowed], host.toLowerCase());
    if (!covered && !host.endsWith("example.com") && !host.endsWith("schema.org")) {
      issues.push({
        severity: "error",
        check: "network/undeclared-host",
        path: file,
        message: `calls \`${host}\` but it is not in w6w.network.allow`,
      });
    }
  }
  return issues;
}

// -------------------------------------------------------------- app  audit --

async function auditApp(name: string): Promise<Issue[]> {
  const dir = `${APPS_DIR}/${name}`;
  const issues: Issue[] = [];
  const add = (severity: Severity, check: string, path: string, message: string) =>
    issues.push({ severity, check, path, message });

  // --- structure
  for (const f of ["package.json", "index.ts", "deno.json"]) {
    try {
      Deno.statSync(`${dir}/${f}`);
    } catch {
      add("error", "structure/missing", f, "required file is missing");
    }
  }

  let pkg: Record<string, any>;
  try {
    pkg = JSON.parse(Deno.readTextFileSync(`${dir}/package.json`));
  } catch (e) {
    add("error", "manifest/unreadable", "package.json", String(e));
    return issues;
  }

  // --- manifest
  const manifest = manifestFromPackageJson(pkg);
  for (const err of validateApp(manifest).errors) {
    add("error", "manifest/spec", `package.json#${err.path}`, err.message);
  }
  for (const c of unknownCategories(manifest)) {
    add(
      "error",
      "manifest/category",
      "package.json#w6w.categories",
      `\`${c}\` is not in the controlled vocabulary (core/rfcs/categories.md)`,
    );
  }

  // --- icon
  const icon = (manifest.appearance as any)?.icon ?? {};
  const iconRef: string | undefined = icon.svg ?? icon.url;
  if (iconRef && iconRef.startsWith(".")) {
    try {
      Deno.statSync(`${dir}/${iconRef}`);
    } catch {
      add("error", "manifest/icon", "package.json#w6w.appearance.icon", `${iconRef} does not exist`);
    }
    if (!icon.svg && iconRef.endsWith(".svg")) {
      add(
        "warn",
        "manifest/icon",
        "package.json#w6w.appearance.icon",
        "an SVG is declared under `url`; ImageObject's vector slot is `svg` (renderers prefer it)",
      );
    }
  }
  if (!iconRef) {
    add(
      "error",
      "manifest/icon",
      "package.json#w6w.appearance.icon",
      "no `svg` or `url` ref — an ImageObject has no other slot a host reads, so the app ships without an icon",
    );
  }
  if (!icon.alt) {
    add("warn", "manifest/icon", "package.json#w6w.appearance.icon", "missing `alt` text");
  }

  // --- icon legibility: the mark has to survive BOTH themes. A one-colour black
  // export is perfect on the light tile and invisible on the dark one; the fix is
  // `appearance.darkMode.icon` (see `_tools/icon-legibility.ts`, which writes it).
  const themes = await verdictFor(name);
  for (const theme of ["light", "dark"] as const) {
    const score = themes[theme];
    if (score.ok) continue;
    add(
      "error",
      "manifest/icon-theme",
      "package.json#w6w.appearance",
      score.note ??
        `icon is illegible on the ${theme} tile ${TILE[theme]} ` +
          `(\u0394E ${score.deltaE}, contrast ${score.contrast}) — declare ` +
          "`appearance.darkMode.icon` (`deno task icons:fix` in _tools/)",
    );
  }

  // --- behavior (import the entry module; type imports are erased at runtime)
  let def: { actions?: any[]; auth?: any[]; triggers?: any[] };
  try {
    def = (await import(`file://${dir}/index.ts`)).default;
  } catch (e) {
    add("error", "entry/import", "index.ts", `cannot import entry module: ${e}`);
    return issues;
  }

  if (!Array.isArray(def?.actions)) {
    add("error", "entry/shape", "index.ts", "default export has no `actions` array");
    return issues;
  }

  const keys = new Set<string>();
  for (const a of def.actions) {
    const where = `actions/${a?.key ?? "?"}`;
    for (const err of validateAction(a).errors) {
      add("error", "action/spec", `${where}#${err.path.replace(/^action\./, "")}`, err.message);
    }
    if (a?.key) {
      if (keys.has(a.key)) add("error", "action/duplicate-key", where, "duplicate action key");
      keys.add(a.key);
    }
    if (!a?.description) add("warn", "action/description", where, "missing `description`");
    if (a?.type === "perform" && a.idempotent === undefined) {
      add("warn", "action/idempotent", where, "`perform` action does not declare `idempotent`");
    }
    if (!a?.output) add("warn", "action/output", where, "declares no `output` fields");
    if (a?.key) {
      try {
        Deno.statSync(`${dir}/tests/actions/${a.key}.test.ts`);
      } catch {
        add("warn", "tests/missing", `tests/actions/${a.key}.test.ts`, "no unit test for action");
      }
    }
  }

  const oauthHosts: string[] = [];
  for (const m of def.auth ?? []) {
    const where = `auth/${m?.key ?? "?"}`;
    for (const err of validateAuth(m).errors) {
      add("error", "auth/spec", `${where}#${err.path.replace(/^auth\./, "")}`, err.message);
    }
    if (typeof m?.test !== "function") {
      add("error", "auth/test", where, "`test` hook is required");
    }
    if (m?.type !== "oauth2" && m?.type !== "custom" && typeof m?.sign !== "function") {
      add("warn", "auth/sign", where, "no `sign` hook — requests will carry no credential");
    }
    for (const f of m?.fields ?? []) {
      if (/token|secret|password|key/i.test(f.key) && f.type !== "secret" && !f.secret) {
        add("error", "auth/secret", `${where}#${f.key}`, "credential field is not `type: \"secret\"`");
      }
    }
    for (const u of [m?.oauth2?.authorizationUrl, m?.oauth2?.tokenUrl, m?.oauth2?.refreshUrl]) {
      if (u) {
        try {
          oauthHosts.push(new URL(u).hostname);
        } catch {
          add("error", "auth/oauth2-url", where, `malformed OAuth URL: ${u}`);
        }
      }
    }
  }

  // --- source-level sandbox rules
  issues.push(...scanSources(dir, pkg.w6w?.network?.allow ?? [], oauthHosts));

  return issues;
}

// -------------------------------------------------------------------- main --

const args = Deno.args.filter((a) => !a.startsWith("--"));
const asJson = Deno.args.includes("--json");
const names = args.length
  ? args
  : [...Deno.readDirSync(APPS_DIR)].filter((e) => e.isDirectory).map((e) => e.name).sort();

const report: Record<string, Issue[]> = {};
let errors = 0, warns = 0;
for (const name of names) {
  const issues = await auditApp(name);
  report[name] = issues;
  errors += issues.filter((i) => i.severity === "error").length;
  warns += issues.filter((i) => i.severity === "warn").length;
}

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  for (const [name, issues] of Object.entries(report)) {
    if (!issues.length) {
      console.log(`\x1b[32m✔\x1b[0m ${name}`);
      continue;
    }
    const e = issues.filter((i) => i.severity === "error").length;
    console.log(`\x1b[31m✖\x1b[0m ${name}  (${e} error, ${issues.length - e} warn)`);
    for (const i of issues) {
      const tag = i.severity === "error" ? "\x1b[31mERR \x1b[0m" : "\x1b[33mWARN\x1b[0m";
      console.log(`    ${tag} [${i.check}] ${i.path} — ${i.message}`);
    }
  }
  console.log(`\n${names.length} apps · ${errors} errors · ${warns} warnings`);
}
Deno.exit(errors > 0 ? 1 : 0);
