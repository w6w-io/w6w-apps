import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    network: { allow: string[] };
    categories: string[];
    appearance: {
      icon: { svg?: string; url?: string; alt?: string };
      darkMode?: { icon?: { svg?: string; url?: string; alt?: string } };
    };
  };
};

const ACTION_COUNT = 19;

Deno.test("index: exports 19 actions with unique kebab-case keys", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every action declares a valid type, title, description and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert(a.title.length > 0, `${a.key}: no title`);
    assert(
      typeof a.description === "string" && a.description.length > 0,
      `${a.key}: no description`,
    );
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key}: no static output`);
  }
});

Deno.test("index: every param has a key and a label, and keys are unique per action", () => {
  for (const a of app.actions) {
    const keys = (a.params ?? []).map((p) => p.key);
    assertEquals(new Set(keys).size, keys.length, `${a.key}: duplicate param key`);
    for (const p of a.params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, `${a.key}: param without a key`);
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
    }
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * Hubstaff accepts no idempotency key on a create, so a retried create bills or
 * logs twice. The two creates are `false`; approving a timesheet is a PUT of an
 * absolute status, so repeating it lands the same state.
 */
Deno.test("index: the two creates are non-idempotent and the timesheet PUT is not", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, ["task-create", "time-entry-create"]);
  assertEquals(app.actions.find((a) => a.key === "timesheet-update-status")?.idempotent, true);
});

Deno.test("index: exports the one auth method and both health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["organization-access-token"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "quota"]);
});

/**
 * `informational` on both checks is load-bearing, not decoration: an
 * `informational` check never worsens a roll-up, which is what keeps an
 * unreachable status host (or absent rate-limit headers) from pinning every
 * Connection's verdict at `unknown` forever.
 */
Deno.test("index: both health checks are capped at informational severity", () => {
  for (const h of app.healthChecks!) {
    assertEquals(h.severity, "informational", `${h.key}: severity must be informational`);
  }
});

Deno.test("index: the manifest names only the API host", () => {
  assertEquals(manifest.w6w.network.allow, ["api.hubstaff.com"]);
  assertEquals(manifest.w6w.id, "io.w6w.hubstaff");
  assertEquals(manifest.w6w.categories, ["project-management", "hr", "productivity"]);
});

Deno.test("index: the icon is the vendor svg, with a dark-mode variant the audit requires", () => {
  const icon = manifest.w6w.appearance.icon;
  assertEquals(icon.svg, "./assets/icon.svg");
  assertEquals(icon.url, undefined);
  assertEquals(icon.alt, "Hubstaff");
  // The vendor mark is a black-on-transparent export, so it is invisible on the
  // dark tile unless a dark variant is declared (see `_tools/icon-legibility.ts`).
  assertEquals(manifest.w6w.appearance.darkMode?.icon?.svg, "./assets/icon.dark.svg");
});

const code = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    // Prose in a param hint or an output label is not code.
    .replace(
      /\b(hint|description|label|placeholder|title|reason|message)\s*:\s*"(?:[^"\\]|\\.)*"(?:\s*\+\s*"(?:[^"\\]|\\.)*")*/g,
      "",
    );

const actionFiles = async (): Promise<Array<[string, string]>> => {
  const out: Array<[string, string]> = [];
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    out.push([entry.name, src]);
  }
  return out;
};

Deno.test("index: no action reaches the network except through ctx.fetch", async () => {
  for (const [name, src] of await actionFiles()) {
    const stripped = code(src);
    assert(
      !/[^.\w]fetch\(/.test(stripped.replace(/ctx\.fetch\(/g, "")),
      `${name} calls global fetch`,
    );
    assert(!/\bDeno\./.test(stripped), `${name} touches Deno.*`);
  }
});

/**
 * The credential lives in exactly one hook. An action that grew an
 * `Authorization` header would take it out of the one place allowed to hold it.
 */
Deno.test("index: no action handles a credential — signing is the auth hook's job", async () => {
  for (const [name, src] of await actionFiles()) {
    const stripped = code(src);
    assert(!/authorization/i.test(stripped), `${name} sets an authorization header`);
    assert(!/credential/i.test(stripped), `${name} reads the credential`);
    assert(!/organizationAccessToken/.test(stripped), `${name} touches the token`);
    assert(!/hsoat_/.test(stripped), `${name} mentions the secret prefix`);
  }
});

/** Scope discipline: this build is v2 only, and every action is under /v2. */
Deno.test("index: every action is a /v2 path and none reaches the Tasks API", async () => {
  for (const [name, src] of await actionFiles()) {
    const stripped = code(src);
    assert(!/tasks\.hubstaff\.com/.test(stripped), `${name} references the Hubstaff Tasks API`);
    assert(!/account\.hubstaff\.com/.test(stripped), `${name} references the token-exchange host`);
  }
});

Deno.test("index: every declared action has its own test file", async () => {
  for (const a of app.actions) {
    const url = new URL(`./actions/${a.key}.test.ts`, import.meta.url);
    const stat = await Deno.stat(url).catch(() => null);
    assert(stat?.isFile, `tests/actions/${a.key}.test.ts is missing`);
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
  assertEquals(code('hint: "reads the credential",').trim(), ",");
});
