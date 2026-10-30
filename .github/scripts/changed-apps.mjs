/**
 * Which apps a change touches, for scripts/verify.sh (CI and the pre-push hook).
 *
 *   node .github/scripts/changed-apps.mjs <base-ref>      prints one pack path per line, or ALL
 *
 * A file under an app's directory selects that app. A file that every app shares (the pack
 * manifest, the root package.json/lockfile, _tools/, these scripts, verify.sh, the
 * publish workflow that pins the building core) selects ALL, since
 * it can break any of them. Anything else (docs, other workflows) selects nothing.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Paths that every app depends on: a change here re-verifies the whole pack. */
export const SHARED = [
  /^w6w-pack\.json$/,
  /^package(-lock)?\.json$/,
  /^_tools\//,
  /^scripts\/verify\.sh$/,
  /^\.github\/scripts\/changed-apps\.mjs$/,
  /^\.github\/scripts\/run-app-tests\.mjs$/,
  // pins the core that builds every app for the catalog
  /^\.github\/workflows\/reload-apps\.yml$/,
];

/**
 * @param {string[]} files    repo-relative paths that changed
 * @param {string[]} appPaths the pack's app paths, e.g. "apps/2chat", "apps/google/gmail"
 * @returns {"ALL" | string[]} the affected app paths, sorted, or "ALL"
 */
export function changedApps(files, appPaths) {
  const apps = [...appPaths].sort((a, b) => b.length - a.length); // most specific first
  const hit = new Set();
  for (const f of files) {
    if (SHARED.some((re) => re.test(f))) return "ALL";
    const app = apps.find((p) => f === p || f.startsWith(`${p}/`));
    if (app) hit.add(app);
  }
  return [...hit].sort();
}

/** The pack's app paths without the leading "./". */
export function packAppPaths(packDir) {
  const pack = JSON.parse(readFileSync(join(packDir, "w6w-pack.json"), "utf8"));
  return pack.apps.map((a) => a.path.replace(/^\.\//, ""));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const base = process.argv[2];
  if (!base) {
    console.error("usage: changed-apps.mjs <base-ref>");
    process.exit(2);
  }
  const packDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const git = (...args) => execFileSync("git", ["-C", packDir, ...args], { encoding: "utf8" });
  // Committed changes since the base, plus anything staged or unstaged in the working tree.
  const files = [
    ...git("diff", "--name-only", `${base}...HEAD`).split("\n"),
    ...git("diff", "--name-only", "HEAD").split("\n"),
  ].filter(Boolean);
  const result = changedApps(files, packAppPaths(packDir));
  console.log(result === "ALL" ? "ALL" : result.join("\n"));
}
