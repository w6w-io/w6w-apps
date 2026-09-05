import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 18;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 1);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every action declares a valid type, a description, output and an execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert(
      typeof a.description === "string" && a.description.length > 0,
      `${a.key}: no description`,
    );
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * `bookmarks-add`, `folders-add` and `highlights-create` all create-or-mutate
 * in a way the docs say is unsafe to retry blindly (re-topping a bookmark,
 * erroring on a duplicate title, creating a second highlight). Every other
 * `perform` sets absolute state (star/unstar/archive/move/delete/reorder),
 * which a retry leaves unchanged.
 */
Deno.test("index: exactly the three documented non-idempotent mutations are marked false", () => {
  const nonIdempotent = app.actions.filter((a) => a.type === "perform" && a.idempotent === false)
    .map((a) => a.key).sort();
  assertEquals(nonIdempotent, ["bookmarks-add", "folders-add", "highlights-create"]);
});

Deno.test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, `${a.key}: param without a key`);
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
    }
  }
});

/** Strip comments so the sandbox guards below scan CODE, not prose explaining the rule. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

Deno.test("index: no action reads a credential or builds an auth header — signing is the Auth hook's job", async () => {
  for (const a of app.actions) {
    // `verify_credentials`/`verify-credentials` is the vendor's OWN endpoint
    // name (account-verify-credentials.ts calls it) — strip that literal
    // before scanning for an action actually touching a credential value.
    const src = (await actionSource(a.key)).replace(/verify[_-]?credentials/gi, "");
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/consumer[_-]?(key|secret)/i.test(src), `${a.key}: touches the OAuth consumer secret`);
    assert(!/oauth_?token/i.test(src), `${a.key}: touches the OAuth token`);
  }
});

Deno.test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

/** The API origin lives in `lib/client.ts` and nowhere else. */
Deno.test("index: no action hard-codes a host or an absolute URL", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/instapaper\.com/.test(src), `${a.key}: contains an Instapaper host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned =
    /^(host|origin|domain|base_?url|consumer_?key|consumer_?secret|oauth_?token|username|password)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- auth --------------------------------------------------------------

Deno.test("index: the xAuth credential fields that carry secrets are declared type secret", () => {
  const [method] = app.auth;
  assertEquals(method.key, "xauth");
  assertEquals(method.type, "custom");
  for (const key of ["consumerKey", "consumerSecret", "password"]) {
    const field = method.fields?.find((f) => f.key === key);
    assertEquals(field?.type, "secret", `${key}: not declared type secret`);
  }
  assertEquals(typeof method.exchange, "function");
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

/**
 * The probe is pinned by path — `account/verify_credentials` is the one
 * documented method that authenticates without ever echoing the token or
 * secret it was signed with.
 */
Deno.test("index: the auth probe is account/verify_credentials", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/xauth.ts", import.meta.url)));
  assert(src.includes("/api/1/account/verify_credentials"), "auth probe path changed");
});

// --- health --------------------------------------------------------------

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks.filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows the API host and not a status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: {
      id: string;
      categories: string[];
      network: { allow: string[] };
      appearance: { icon: { svg: string }; darkMode?: { icon: { svg: string } } };
    };
  };
  assertEquals(manifest.w6w.id, "io.w6w.instapaper");
  assertEquals(manifest.w6w.network.allow, ["www.instapaper.com"]);
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
  // A single-colour black mark is invisible on the dark icon tile — the
  // manifest audit (`_tools/icon-legibility.ts`) requires this reversed
  // variant for exactly that reason.
  assertEquals(manifest.w6w.appearance.darkMode?.icon.svg, "./assets/icon.dark.svg");
});

Deno.test("index: the icon is the vendor's real mark (simpleicons.org, verified 200 + correct SVG)", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(svg.includes("<title>Instapaper</title>"), "icon is not labelled Instapaper");
  // Downloaded verbatim from https://cdn.simpleicons.org/instapaper — the
  // single path this pack's other apps use for their simple-icons marks.
  assert(
    svg.includes("M14.766 20.259c0 1.819.271 2.089 2.934 2.292V24H6.301"),
    "the vendor's geometry changed — the mark was redrawn",
  );
});

/** Same geometry, reversed to white — `_tools/icon-legibility.ts fix`'s generated dark-tile variant. */
Deno.test("index: the dark-mode icon is the same mark, reversed to white", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.dark.svg", import.meta.url));
  assert(svg.includes('fill="#ffffff"'), "dark icon is not reversed to white");
  assert(
    svg.includes("M14.766 20.259c0 1.819.271 2.089 2.934 2.292V24H6.301"),
    "dark icon geometry does not match the light mark",
  );
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
