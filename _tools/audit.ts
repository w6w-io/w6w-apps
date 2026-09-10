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
function manifestFromPackageJson(
  pkg: Record<string, any>,
): Record<string, unknown> {
  const w = pkg.w6w ?? {};
  const unscoped = (
    n?: string,
  ) => (n ? n.slice(n.lastIndexOf("/") + 1) : undefined);
  const author = typeof pkg.author === "string"
    ? { name: pkg.author }
    : pkg.author;
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
/** n8n-specific vocabulary with no w6w meaning — checked against PARAM text only. */
const RE_N8N_VOCAB = /\b(binary property|fixed collection|resource locator)\b/i;

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

// --------------------------------------------------------------- params ----

/**
 * Recurse into `children` for a structural param walk — covers BOTH `group`
 * (a nested value under the group's own key) and `section` (layout-only,
 * flat value in the enclosing form). Never a text grep: `param/group-childless`
 * and `param/n8n-vocabulary` below run over the parsed `ActionDefinition.params`
 * so a comment quoting `type: "group"` or a code-comment "binary property"
 * cannot fire them (see `apps/mailgun/tests/index.test.ts:34-42`'s own `walk`,
 * which this mirrors).
 */
function walkParams(
  params: unknown[] | undefined,
  visit: (p: Record<string, unknown>) => void,
): void {
  for (const raw of params ?? []) {
    const p = raw as Record<string, unknown> | null | undefined;
    if (!p) continue;
    visit(p);
    if (Array.isArray(p.children)) walkParams(p.children as unknown[], visit);
  }
}

/**
 * `param/unread`, severity `warn` (D-6) — flags a declared param whose key
 * `execute` never reads.
 *
 * Scoped to the WHOLE FILE, never just the `execute` body: a same-file helper
 * declared elsewhere in the file (`apps/mailjet/actions/send-email.ts`'s
 * `buildMessage`, declared at `:72`, reading `input.from`/`input.to` at
 * `:74-75`, called from `execute` at `:163`) has to count as a read.
 *
 * Exempts an action that forwards its whole input object wholesale, since
 * none of those name individual fields for this scan to check off: the bare
 * identifier handed whole to a call (`crmBatchCreate(ctx, "contacts", input)`),
 * a `...input` spread, a `...rest` destructure element, generic iteration
 * over every supplied key (`Object.entries(input)` —
 * `apps/asana/actions/create-task.ts:44-50`), and a computed bracket access
 * whose index is a variable rather than a string literal (`for (const k of
 * [...] as const) { … input[k] … }` — `apps/asana/actions/
 * create-project.ts:66-69`).
 *
 * Alias tracking is mandatory, not optional (D-6): `const p = input`,
 * `const p = input as Record<string, unknown>` (then `p.siteId`), and
 * destructuring (`const { a, b } = input`, which marks `a`/`b` read
 * directly). A literal `input.<key>` scan with only the two documented
 * sandbox exemptions measured 1,254 candidates against the real pack —
 * dominated by exactly this aliasing shape.
 *
 * When `actions/${a.key}.ts` does not exist, the caller (`scanSources`)
 * simply never visits that file, so this never runs for it — no flag, no
 * crash.
 */
function paramUnreadIssues(
  rel: string,
  src: string,
  action: { key?: string; params?: unknown[] },
): Issue[] {
  const key = action.key;
  if (!key) return [];
  const code = stripComments(src);

  // A `section`'s children live FLAT in the enclosing form (rfcs/param.md
  // "Sections"), addressed the same as a top-level param — recurse into
  // them. A `group`'s children nest under the group's own key and are never
  // read individually, so its subtree is deliberately NOT flattened here.
  const topKeys: string[] = [];
  const collect = (params: unknown[] | undefined) => {
    for (const raw of params ?? []) {
      const p = raw as Record<string, unknown> | null | undefined;
      if (!p?.key) continue;
      if (p.type === "section") collect(p.children as unknown[] | undefined);
      else topKeys.push(String(p.key));
    }
  };
  collect(action.params);
  if (topKeys.length === 0) return [];

  // No `execute` identifier anywhere in the file (comments stripped) means
  // this action's `execute` hook is not defined here — some apps build the
  // whole `ActionDefinition` from a shared factory in `lib/` (e.g. mastodon's
  // `interaction()`), and this file has nothing for a per-file scan to read.
  // Defaulting to "input" here would flag every one of that factory's params
  // as unread on every call site — a false positive this scan cannot resolve
  // without following the import, so it skips instead of guessing.
  if (!/\bexecute\b/.test(code)) return [];

  const sigMatch = /\bexecute\s*\(\s*(\w+)/.exec(code);
  const primary = sigMatch?.[1] ?? "input";
  if (primary.startsWith("_")) return []; // deliberately unused — nothing to flag

  // Blank out the `execute(input, ctx)` SIGNATURE itself before scanning the
  // body: it declares the parameter named `input`, and a naive "bare
  // identifier handed to a call" scan (below) would otherwise read its own
  // `(input,` declaration as a wholesale forward and exempt every action.
  const body = sigMatch
    ? code.slice(0, sigMatch.index) +
      code.slice(sigMatch.index + sigMatch[0].length)
    : code;

  // Transitive alias tracking: `const p = input;` or `const p = input as X`
  // — matched by what comes IMMEDIATELY after `input` (`;` or the `as`
  // keyword) rather than by trying to consume the whole cast expression,
  // which can be a multi-line inline object type
  // (`apps/braze/actions/user-identify.ts`'s `const p = input as {
  // aliasesToIdentify?: unknown; … };`) whose own `;`-separated members would
  // otherwise truncate the match early.
  const aliases = new Set([primary]);
  for (let grew = true; grew;) {
    grew = false;
    for (const alias of [...aliases]) {
      const re = new RegExp(
        `const\\s+(\\w+)\\s*=\\s*${alias}\\b\\s*(?:;|as\\b)`,
        "g",
      );
      for (const m of body.matchAll(re)) {
        if (!aliases.has(m[1])) {
          aliases.add(m[1]);
          grew = true;
        }
      }
    }
  }

  const readKeys = new Set<string>();
  let wholesale = false;
  for (const alias of aliases) {
    const destructure = new RegExp(
      `const\\s*\\{([^}]*)\\}\\s*=\\s*${alias}\\b`,
      "g",
    );
    for (const m of body.matchAll(destructure)) {
      for (
        const entry of m[1].split(",").map((s) => s.trim()).filter(Boolean)
      ) {
        if (entry.startsWith("...")) {
          wholesale = true; // `...rest` — captures every remaining key
          continue;
        }
        const name = entry.split(":")[0].split("=")[0].trim();
        if (name) readKeys.add(name);
      }
    }
    if (new RegExp(`Object\\.entries\\(\\s*${alias}\\b\\s*\\)`).test(body)) {
      wholesale = true;
    }
    if (new RegExp(`\\.\\.\\.${alias}\\b`).test(body)) wholesale = true;
    // The bare identifier handed whole to a call: `helper(ctx, "x", input)`,
    // `buildMessage(input)`, `return input` — optionally through an inline
    // cast at the call site itself (`routingFields(input as unknown as
    // Record<string, unknown>)` — `apps/missive/actions/message-create.ts`).
    // Anything that is NOT a `.`/`[` member access.
    if (
      new RegExp(
        `(?:\\(|,|return\\s)\\s*${alias}\\b(?:\\s+as\\s+[\\s\\S]*?)?\\s*[,)]`,
      ).test(body)
    ) wholesale = true;
    // A COMPUTED bracket access whose index is a variable, not a string
    // literal — `for (const k of [...] as const) { ... input[k] ... }`
    // (`apps/asana/actions/create-project.ts`) — is generic iteration over a
    // named-but-dynamic key set, the same class as (ii) above; a literal
    // `input["siteId"]` is a real per-key read and is handled separately.
    if (new RegExp(`\\b${alias}\\[\\s*[A-Za-z_$][\\w$]*\\s*\\]`).test(body)) {
      wholesale = true;
    }
    // The bare identifier as an OBJECT LITERAL property's value — `{ method:
    // "POST", body: input }` (`apps/textmagic/actions/template-create.ts`) —
    // the same wholesale-forward shape as (i), just inside a literal instead
    // of a call's argument list.
    if (new RegExp(`:\\s*${alias}\\b\\s*[,}]`).test(body)) wholesale = true;
  }
  if (wholesale) return [];

  const issues: Issue[] = [];
  for (const k of topKeys) {
    if (readKeys.has(k)) continue;
    const seen = [...aliases].some((alias) =>
      new RegExp(`\\b${alias}\\.${k}\\b`).test(body) ||
      new RegExp(`\\b${alias}\\[\\s*["']${k}["']\\s*\\]`).test(body)
    );
    if (!seen) {
      issues.push({
        severity: "warn",
        check: "param/unread",
        path: `${rel}#${k}`,
        message: `declared param \`${k}\` is never read by \`execute\``,
      });
    }
  }
  return issues;
}

function scanSources(
  appDir: string,
  allow: string[],
  oauthHosts: string[],
  actions: Array<{ key?: string; params?: unknown[] }>,
): Issue[] {
  const issues: Issue[] = [];
  const allowed = new Set([...allow, ...oauthHosts]);
  const seenHosts = new Map<string, string>(); // host -> first file that used it
  // `param/unread`'s entry point (D-13 notes): reuses this walk over
  // `actions/` rather than a second file-walking loop. Keyed by the
  // conventional path, so an action whose source is not there is simply
  // never visited below — skipped, never flagged, never crashed.
  const actionByFile = new Map<string, { key?: string; params?: unknown[] }>();
  for (const a of actions) {
    if (a?.key) actionByFile.set(`actions/${a.key}.ts`, a);
  }

  for (const sub of ["actions", "auth", "lib", "triggers"]) {
    for (const file of walk(`${appDir}/${sub}`)) {
      const rel = file.slice(appDir.length + 1);
      const src = Deno.readTextFileSync(file);
      const lines = src.split("\n");

      if (sub === "actions") {
        const action = actionByFile.get(rel);
        if (action) issues.push(...paramUnreadIssues(rel, src, action));
      }

      for (const [i, line] of lines.entries()) {
        const at = `${rel}:${i + 1}`;
        // Skip comments — prose mentions of `fetch`/hosts are not code.
        const code = line.replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, "");
        if (!code.trim()) continue;

        if (
          RE_BARE_FETCH.test(code) &&
          !/\bctx\.fetch|typeof fetch|fetch:/.test(code)
        ) {
          issues.push({
            severity: "error",
            check: "sandbox/global-fetch",
            path: at,
            message:
              "calls global `fetch` — the sandbox denies it; use `ctx.fetch`",
          });
        }
        if (RE_DENIED_GLOBAL.test(code)) {
          issues.push({
            severity: "error",
            check: "sandbox/denied-global",
            path: at,
            message: `uses a sandbox-denied global: ${
              code.trim().slice(0, 80)
            }`,
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
            message: `relative import \`${
              m[1]
            }\` is missing its \`.ts\` extension`,
          });
        }
      }

      // Egress hosts are read from code only. URLs inside comments (source
      // attribution, doc links) and inside user-facing `hint:` / `description:`
      // prose are documentation, not requests.
      const codeOnly = stripComments(src)
        .replace(
          /\b(?:hint|description|placeholder|label|title|subtitle):\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)(?:\s*\+\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`))*/g,
          "",
        );
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
    if (
      !covered && !host.endsWith("example.com") && !host.endsWith("schema.org")
    ) {
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
  const add = (
    severity: Severity,
    check: string,
    path: string,
    message: string,
  ) => issues.push({ severity, check, path, message });

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
      add(
        "error",
        "manifest/icon",
        "package.json#w6w.appearance.icon",
        `${iconRef} does not exist`,
      );
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
    add(
      "warn",
      "manifest/icon",
      "package.json#w6w.appearance.icon",
      "missing `alt` text",
    );
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
    add(
      "error",
      "entry/import",
      "index.ts",
      `cannot import entry module: ${e}`,
    );
    return issues;
  }

  if (!Array.isArray(def?.actions)) {
    add(
      "error",
      "entry/shape",
      "index.ts",
      "default export has no `actions` array",
    );
    return issues;
  }

  const keys = new Set<string>();
  for (const a of def.actions) {
    const where = `actions/${a?.key ?? "?"}`;
    for (const err of validateAction(a).errors) {
      add(
        "error",
        "action/spec",
        `${where}#${err.path.replace(/^action\./, "")}`,
        err.message,
      );
    }
    if (a?.key) {
      if (keys.has(a.key)) {
        add("error", "action/duplicate-key", where, "duplicate action key");
      }
      keys.add(a.key);
    }
    if (!a?.description) {
      add("warn", "action/description", where, "missing `description`");
    }
    if (a?.type === "perform" && a.idempotent === undefined) {
      add(
        "warn",
        "action/idempotent",
        where,
        "`perform` action does not declare `idempotent`",
      );
    }
    if (!a?.output) {
      add("warn", "action/output", where, "declares no `output` fields");
    }
    if (a?.key) {
      try {
        Deno.statSync(`${dir}/tests/actions/${a.key}.test.ts`);
      } catch {
        add(
          "warn",
          "tests/missing",
          `tests/actions/${a.key}.test.ts`,
          "no unit test for action",
        );
      }
    }

    // Structural — over the parsed `ActionDefinition.params`, never a text
    // grep (D-7, M3): a comment quoting `type: "group"` or "binary property"
    // in prose must not trip either check below.
    walkParams(a?.params, (p) => {
      if (
        p.type === "group" &&
        !(Array.isArray(p.children) && (p.children as unknown[]).length > 0)
      ) {
        add(
          "error",
          "param/group-childless",
          `${where}#${String(p.key)}`,
          '`type: "group"` declares no (or empty) `children` — it falls back to the JSON ' +
            "editor instead of rendering as a nested form (T1.1.1, D-7)",
        );
      }
      // The action's/app's own `description` are deliberately out of scope —
      // only a PARAM's own label/hint/placeholder/description count.
      for (
        const field of ["label", "hint", "placeholder", "description"] as const
      ) {
        const v = p[field];
        if (typeof v !== "string") continue;
        const m = RE_N8N_VOCAB.exec(v);
        if (m) {
          add(
            "error",
            "param/n8n-vocabulary",
            `${where}#${String(p.key)}`,
            `\`${field}\` uses n8n-specific vocabulary with no w6w meaning: "${
              m[0]
            }"`,
          );
        }
      }
    });
  }

  const oauthHosts: string[] = [];
  for (const m of def.auth ?? []) {
    const where = `auth/${m?.key ?? "?"}`;
    for (const err of validateAuth(m).errors) {
      add(
        "error",
        "auth/spec",
        `${where}#${err.path.replace(/^auth\./, "")}`,
        err.message,
      );
    }
    if (typeof m?.test !== "function") {
      add("error", "auth/test", where, "`test` hook is required");
    }
    if (
      m?.type !== "oauth2" && m?.type !== "custom" &&
      typeof m?.sign !== "function"
    ) {
      add(
        "warn",
        "auth/sign",
        where,
        "no `sign` hook — requests will carry no credential",
      );
    }
    for (const f of m?.fields ?? []) {
      if (
        /token|secret|password|key/i.test(f.key) && f.type !== "secret" &&
        !f.secret
      ) {
        add(
          "error",
          "auth/secret",
          `${where}#${f.key}`,
          'credential field is not `type: "secret"`',
        );
      }
    }
    for (
      const u of [
        m?.oauth2?.authorizationUrl,
        m?.oauth2?.tokenUrl,
        m?.oauth2?.refreshUrl,
      ]
    ) {
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
  issues.push(
    ...scanSources(dir, pkg.w6w?.network?.allow ?? [], oauthHosts, def.actions),
  );

  return issues;
}

// -------------------------------------------------------------------- main --

const args = Deno.args.filter((a) => !a.startsWith("--"));
const asJson = Deno.args.includes("--json");
const names = args.length
  ? args
  : [...Deno.readDirSync(APPS_DIR)].filter((e) => e.isDirectory).map((e) =>
    e.name
  ).sort();

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
    console.log(
      `\x1b[31m✖\x1b[0m ${name}  (${e} error, ${issues.length - e} warn)`,
    );
    for (const i of issues) {
      const tag = i.severity === "error"
        ? "\x1b[31mERR \x1b[0m"
        : "\x1b[33mWARN\x1b[0m";
      console.log(`    ${tag} [${i.check}] ${i.path} — ${i.message}`);
    }
  }
  console.log(`\n${names.length} apps · ${errors} errors · ${warns} warnings`);
}
Deno.exit(errors > 0 ? 1 : 0);
