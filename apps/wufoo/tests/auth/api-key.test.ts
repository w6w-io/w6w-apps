import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, BANNED_PATH, PROBE_PATH } from "../../auth/api-key.ts";
import { IGNORED_PASSWORD } from "../../lib/client.ts";
import { API_KEY, BASE, envelope, mockCtx, SUBDOMAIN } from "../_helpers.ts";

interface SignableRequest {
  url: string;
  headers: Record<string, string>;
}

/** `sign` is network-less, so the ctx it is handed makes no requests. */
function signWith(request: SignableRequest, credential: Record<string, unknown>): SignableRequest {
  const { ctx } = mockCtx([]);
  return apiKey.sign!({ request, credential } as never, ctx) as SignableRequest;
}

Deno.test("auth: declares HTTP Basic carrying the subdomain and the key", () => {
  assertEquals(apiKey.key, "api-key");
  // `basic`, not `apiKey`: the key rides in the username position, which no
  // apiKey placement block describes.
  assertEquals(apiKey.type, "basic");
  const fields = apiKey.fields ?? [];
  assertEquals(fields.map((f) => f.key), ["subdomain", "apiKey"]);
  assertEquals(fields.find((f) => f.key === "apiKey")?.type, "secret");
  assertEquals(fields.find((f) => f.key === "subdomain")?.type, "string");
});

/** The key is the USERNAME and the password is the vendor's ignored placeholder. */
Deno.test("authHeaders: puts the key in the username position", () => {
  const header = authHeaders({ apiKey: API_KEY }).authorization;
  assert(header.startsWith("Basic "));
  assertEquals(atob(header.slice("Basic ".length)), `${API_KEY}:${IGNORED_PASSWORD}`);
});

Deno.test("sign: stamps the Basic header and leaves the URL alone", () => {
  const request = { url: `${BASE}/forms.json`, headers: {} as Record<string, string> };
  const signed = signWith(request, { subdomain: SUBDOMAIN, apiKey: API_KEY });
  assertEquals(atob(signed.headers["authorization"].slice(6)), `${API_KEY}:${IGNORED_PASSWORD}`);
  assertEquals(signed.url, `${BASE}/forms.json`);
});

/**
 * THE most important assertion in this app. `users.json` returns an `ApiKey`
 * field for every user on the account — other people's credentials, not just
 * the caller's. The probe must be `forms.json`.
 */
Deno.test("test: probes forms.json, never the key-leaking users.json", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("Forms", [{ Hash: "h1" }]) }]);
  const result = await apiKey.test!(
    { credential: { subdomain: SUBDOMAIN, apiKey: API_KEY } } as never,
    ctx,
  );
  assertEquals(result, { ok: true });
  assertEquals(PROBE_PATH, "/forms.json");
  assertEquals(calls[0].url, `${BASE}${PROBE_PATH}`);
  assert(!calls[0].url.includes(BANNED_PATH), "the probe must never touch users.json");
});

Deno.test("test: a full URL in the subdomain field is normalised before probing", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("Forms", []) }]);
  await apiKey.test!(
    { credential: { subdomain: "https://fishbowl.wufoo.com/", apiKey: API_KEY } } as never,
    ctx,
  );
  assertEquals(calls[0].url, `${BASE}${PROBE_PATH}`);
});

/** A key of the wrong shape cannot be valid, so it is never put on the wire. */
Deno.test("test: rejects a malformed key without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test!(
    { credential: { subdomain: SUBDOMAIN, apiKey: "not-a-key" } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message!.includes("four"), result.message);
  assertEquals(calls.length, 0);
});

Deno.test("test: reports a missing half of the credential without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await apiKey.test!({ credential: { apiKey: API_KEY } } as never, ctx)).ok, false);
  assertEquals(
    (await apiKey.test!({ credential: { subdomain: SUBDOMAIN } } as never, ctx)).ok,
    false,
  );
  assertEquals(calls.length, 0);
});

/** A valid key on the wrong account fails, and the message says exactly that. */
Deno.test("test: a 401 blames the account/key pairing, which is the usual cause", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "<html>Unauthorized</html>" }]);
  const result = await apiKey.test!(
    { credential: { subdomain: SUBDOMAIN, apiKey: API_KEY } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message!.includes("fishbowl"), result.message);
  assert(result.message!.includes("another account"), result.message);
});

Deno.test("test: a 404 means there is no such account", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }]);
  const result = await apiKey.test!(
    { credential: { subdomain: SUBDOMAIN, apiKey: API_KEY } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message!.includes("No Wufoo account"), result.message);
});

Deno.test("test: a 200 that is not a form list is rejected", async () => {
  const { ctx } = mockCtx([{ body: { message: "sign in" } }]);
  const result = await apiKey.test!(
    { credential: { subdomain: SUBDOMAIN, apiKey: API_KEY } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message!.includes("is the subdomain right?"), result.message);
});

/**
 * `afterConnect` makes no request at all — the obvious enrichment is the user
 * record, and that is exactly the response carrying every user's API key.
 */
Deno.test("afterConnect: records the subdomain and fetches nothing", () => {
  const { ctx, calls } = mockCtx([]);
  const display = apiKey.afterConnect!(
    { credential: { subdomain: "https://fishbowl.wufoo.com", apiKey: API_KEY } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display, { subdomain: "fishbowl", site: { host: "fishbowl.wufoo.com" } });
  assertEquals(calls.length, 0, "must not call users.json for a nicer label");
});

Deno.test("afterConnect: never republishes the key, and survives a bad subdomain", () => {
  const { ctx } = mockCtx([]);
  const display = apiKey.afterConnect!(
    { credential: { subdomain: SUBDOMAIN, apiKey: API_KEY } } as never,
    ctx,
  );
  assert(!JSON.stringify(display).includes(API_KEY));
  assertEquals(
    apiKey.afterConnect!({ credential: { subdomain: "not valid", apiKey: API_KEY } } as never, ctx),
    {},
  );
});
