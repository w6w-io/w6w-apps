/**
 * Exercises `audit.ts` as a subprocess. It has no `import.meta.main` guard —
 * its arg parsing, its walk over `apps/`, and an unconditional `Deno.exit()`
 * sit at module top level — so importing it in-process would run the whole
 * CLI and kill the test runner. Shell out instead (`Deno.Command`) and read
 * `--json`.
 *
 * Pins the `entry/import` check's liveness against a genuinely broken fixture
 * (`_fixtures/entry-import-broken/`, which fails on a relative import that
 * does not exist — never `@w6w/types`, which would test the symptom this
 * task removes rather than the check itself) and confirms a real, previously
 * false-flagged app now audits clean.
 */
import { assert, assertEquals } from "@std/assert";

const AUDIT_URL = new URL("./audit.ts", import.meta.url);
const TOOLS_DIR = new URL("./", import.meta.url);
const DENO_JSON_URL = new URL("./deno.json", import.meta.url);

/**
 * Escapes `_tools/` to reach the fixture: `auditApp` builds
 * `dir = <pack>/apps/<name>`, so the argument has to walk back out of `apps/`
 * and into `_tools/_fixtures/…` — see T1.1.1 pinned decision 4.
 */
const FIXTURE = "../_tools/_fixtures/entry-import-broken";

interface Issue {
  severity: "error" | "warn";
  check: string;
  path: string;
  message: string;
}

async function runAudit(
  ...names: string[]
): Promise<{ code: number; report: Record<string, Issue[]> }> {
  const command = new Deno.Command(Deno.execPath(), {
    args: ["run", "--no-check", "-A", AUDIT_URL.pathname, "--json", ...names],
    cwd: TOOLS_DIR.pathname,
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr } = await command.output();
  const out = new TextDecoder().decode(stdout);
  let report: Record<string, Issue[]>;
  try {
    report = JSON.parse(out);
  } catch {
    throw new Error(
      `audit.ts did not print valid JSON.\nstdout: ${out}\nstderr: ${
        new TextDecoder().decode(stderr)
      }`,
    );
  }
  return { code, report };
}

function issuesFor(report: Record<string, Issue[]>, key: string): Issue[] {
  const issues = report[key];
  assert(
    issues !== undefined,
    `no report entry for "${key}"; got keys: ${Object.keys(report)}`,
  );
  return issues;
}

Deno.test("entry/import: still errors on an entry module with a broken relative import", async () => {
  const { code, report } = await runAudit(FIXTURE);
  const issues = issuesFor(report, FIXTURE);
  const entryImport = issues.filter((i) => i.check === "entry/import");
  assertEquals(
    entryImport.length,
    1,
    `expected exactly one entry/import issue, got ${JSON.stringify(issues)}`,
  );
  assertEquals(entryImport[0].severity, "error");
  assertEquals(code, 1);
});

Deno.test("entry/import: the fixture trips that check and nothing else", async () => {
  const { report } = await runAudit(FIXTURE);
  const issues = issuesFor(report, FIXTURE);
  assertEquals(
    issues.length,
    1,
    `expected exactly one issue, got ${JSON.stringify(issues)}`,
  );
  assertEquals(issues[0].check, "entry/import");
});

Deno.test("entry/import: a healthy app that imports `@w6w/types` resolves cleanly", async () => {
  const { code, report } = await runAudit("anthropic");
  const issues = issuesFor(report, "anthropic");
  const entryImport = issues.filter((i) => i.check === "entry/import");
  const errors = issues.filter((i) => i.severity === "error");
  assertEquals(
    entryImport.length,
    0,
    `expected zero entry/import issues, got ${JSON.stringify(entryImport)}`,
  );
  assertEquals(
    errors.length,
    0,
    `expected zero errors, got ${JSON.stringify(errors)}`,
  );
  assertEquals(code, 0);
});

Deno.test("_tools/deno.json's `@w6w/types` mapping resolves to a real module", async () => {
  const config = JSON.parse(await Deno.readTextFile(DENO_JSON_URL));
  assertEquals(
    config.imports?.["@w6w/types"],
    "../../core/packages/types/mod.ts",
  );

  // Every `@w6w/types` import in the pack today is `import type`, erased
  // before Deno resolves it — an app importing it would stay green with the
  // key present and ANY target. Only a dynamic, runtime import pins the path.
  const mod = await import("@w6w/types");
  const keys = Object.keys(mod);
  assert(
    keys.length >= 1,
    `expected @w6w/types to export at least one value, got ${
      JSON.stringify(keys)
    }`,
  );
});

/**
 * T1.2.1 — the auditor's `network/undeclared-host` check now calls
 * `@w6w/runtime`'s `hostAllowed()` instead of a locally re-derived predicate.
 * The fixture below (`_tools/_fixtures/network-allow-wildcard-apex/`) declares
 * `network.allow: ["*.fixture-apex.test"]` and its one scanned source file
 * (`lib/client.ts`) references three hosts in real code: a covered
 * subdomain, the same subdomain mixed-case, and the bare apex — which a
 * `"*.apex"` allow entry never covers (see `hostAllowed()`'s doc comment).
 */
const NETWORK_FIXTURE = "../_tools/_fixtures/network-allow-wildcard-apex";

Deno.test("network/undeclared-host: a `*.apex` entry covers subdomains, in any case, but not the apex", async () => {
  const { report } = await runAudit(NETWORK_FIXTURE);
  const issues = issuesFor(report, NETWORK_FIXTURE);
  const undeclared = issues.filter((i) =>
    i.check === "network/undeclared-host"
  );
  assertEquals(
    undeclared.length,
    1,
    `expected exactly one network/undeclared-host issue, got ${
      JSON.stringify(issues)
    }`,
  );
  assert(
    /fixture-apex\.test/.test(undeclared[0].message) &&
      !/sub\.fixture-apex\.test/i.test(undeclared[0].message),
    `expected the issue to name the bare apex, got: ${undeclared[0].message}`,
  );
  assertEquals(
    issues.length,
    1,
    `expected no other issue on the fixture, got ${JSON.stringify(issues)}`,
  );
});

Deno.test("network/undeclared-host: a bare `*` entry still covers every host (grist)", async () => {
  const { report } = await runAudit("grist");
  const issues = issuesFor(report, "grist");
  const undeclared = issues.filter((i) =>
    i.check === "network/undeclared-host"
  );
  assertEquals(
    undeclared.length,
    0,
    `expected zero network/undeclared-host issues, got ${
      JSON.stringify(undeclared)
    }`,
  );
});

Deno.test("network/undeclared-host: still fires on a genuinely undeclared host (basecamp)", async () => {
  const { report } = await runAudit("basecamp");
  const issues = issuesFor(report, "basecamp");
  const undeclared = issues.filter((i) =>
    i.check === "network/undeclared-host"
  );
  assertEquals(
    undeclared.length,
    1,
    `expected exactly one network/undeclared-host issue, got ${
      JSON.stringify(issues)
    }`,
  );
  assert(
    /github\.com/.test(undeclared[0].message),
    `expected the issue to name github.com, got: ${undeclared[0].message}`,
  );
});

Deno.test("_tools/deno.json's `@w6w/runtime` mapping resolves to the real `hostAllowed`", async () => {
  const config = JSON.parse(await Deno.readTextFile(DENO_JSON_URL));
  assertEquals(
    config.imports?.["@w6w/runtime"],
    "../../core/packages/runtime/mod.ts",
  );

  // A wrong-depth target one directory too shallow/deep can still resolve if
  // a stray sibling symlink rescues it — only calling the *behavior* pins the
  // specifier actually reached the real `hostAllowed()` (T1.2.1 mutant M2).
  const { hostAllowed } = await import("@w6w/runtime");
  assertEquals(hostAllowed(["*.zendesk.com"], "acme.zendesk.com"), true);
  assertEquals(hostAllowed(["*.zendesk.com"], "zendesk.com"), false);
  assertEquals(hostAllowed(["*"], "anything.example"), true);
});
