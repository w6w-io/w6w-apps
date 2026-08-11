import { assert, assertEquals } from "@std/assert";
import apiKey, {
  basicHeader,
  IGNORED_PASSWORD,
  PROBE_PATH,
  WHY_NOT_CLIENT_DETAILS,
} from "../../auth/api-key.ts";
import type { HookContext } from "@w6w/types";
import { API_PATH, errorBody, mockCtx, pathOf } from "../_helpers.ts";

/**
 * The vendor's own worked example is the test vector:
 *
 *   curl -u "dklkmwlmkdy7qwd98y98y98y8d68d9:x" https://api.createsend.com/api/v3.3/clients.json
 *
 * so the encoded payload is `${key}:x`, computed here independently of the
 * implementation rather than by calling the same helper twice.
 */
Deno.test("api-key: the Basic payload is base64 of key + ':' + the ignored password", () => {
  const key = "dklkmwlmkdy7qwd98y98y98y8d68d9";
  const expected = `Basic ${btoa(`${key}:x`)}`;
  assertEquals(basicHeader(key), expected);
  assertEquals(IGNORED_PASSWORD, "x");
  // And the decoded form really does carry the separator.
  assertEquals(atob(basicHeader(key).slice("Basic ".length)), `${key}:x`);
});

Deno.test("api-key: sign stamps the header on the outbound request and returns it", () => {
  const request = {
    method: "GET",
    url: "https://api.createsend.com/api/v3.3/clients.json",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!(
    { request, credential: { apiKey: "secret-key" } } as never,
    {} as HookContext,
  ) as typeof request;
  assertEquals(signed.headers["authorization"], basicHeader("secret-key"));
});

/** `sign` is network-less: it must not reach for ctx.fetch. */
Deno.test("api-key: sign makes no request", () => {
  const { ctx, calls } = mockCtx([]);
  apiKey.sign!(
    {
      request: { method: "GET", url: "https://x", headers: {} as Record<string, string> },
      credential: { apiKey: "k" },
    } as never,
    ctx,
  );
  assertEquals(calls.length, 0);
});

// --- the probe --------------------------------------------------------------

Deno.test("api-key: test probes /systemdate.json, not the client-details endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: { SystemDate: "2026-08-11 06:18:33" } }]);
  const result = await apiKey.test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), `${API_PATH}${PROBE_PATH}`);
  assertEquals(calls[0].headers["authorization"], basicHeader("k"));
});

/**
 * The endpoint that can never be the probe: `GET /clients/{clientid}.json`
 * returns a live client key. Pinned by path so a future "shorter probe" swap is
 * deliberate rather than accidental.
 */
Deno.test("api-key: the probe path is not a client-details read", () => {
  assertEquals(PROBE_PATH, "/systemdate.json");
  assert(!PROBE_PATH.includes("/clients/"), WHY_NOT_CLIENT_DETAILS);
  assert(!PROBE_PATH.includes("billingdetails"), "billingdetails is 403 for a non-agency customer");
});

Deno.test("api-key: a missing credential fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

// --- classification ---------------------------------------------------------

/**
 * Code 100 covers BOTH "the key is wrong" and "no credential reached the
 * request" — measured byte-identical on 2026-08-11 — so the message has to name
 * that ambiguity rather than assert one cause.
 */
Deno.test("api-key: code 100 is reported without asserting which of its two causes", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody(100, "Invalid API Key") }]);
  const result = await apiKey.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("code 100"), result.message);
  assert(
    result.message!.includes("no credential reaches the request"),
    "the 100 message must state that a missing credential is indistinguishable: " + result.message,
  );
});

/**
 * The classification that matters most: a 401 is NOT automatically a bad
 * credential. Code 102 means the credential is fine and the client id is wrong.
 */
Deno.test("api-key: a 401 code 102 is not reported as a rejected key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody(102, "Invalid ClientID") }]);
  const result = await apiKey.test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(result.ok, false);
  assert(
    !result.message!.includes("rejected the API key"),
    "code 102 must not be reported as a rejected key: " + result.message,
  );
  assert(result.message!.includes("102"), result.message);
});

/** A 403 code 403 means the credential was accepted and the endpoint refused. */
Deno.test("api-key: code 403 says the credential itself was accepted", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: errorBody(403, "Not allowed for a Non-agency Customer.") },
  ]);
  const result = await apiKey.test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("credential itself was accepted"), result.message);
});

/** A 500 with an HTML body must not be classified as an auth failure. */
Deno.test("api-key: a non-JSON error falls back to the status without inventing a code", async () => {
  const { ctx } = mockCtx([{
    status: 502,
    body: "<html>bad gateway</html>",
    headers: { "content-type": "text/html" },
  }]);
  const result = await apiKey.test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("502"), result.message);
  assert(!result.message!.includes("code "), "no code should be invented: " + result.message);
});

// --- the probe never echoes the credential ----------------------------------

/**
 * The probe's own response is the thing most likely to carry a secret back out.
 * The chosen endpoint returns one date string, so nothing it could return can
 * be a credential — asserted here by feeding it a response that DOES contain
 * one and checking it does not reach the result.
 */
Deno.test("api-key: nothing from the probe response reaches the test result", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { Code: 100, Message: "Invalid API Key", ApiKey: "639d8cc27198202f5fe6037a8b17a29a" },
  }]);
  const result = await apiKey.test({ credential: { apiKey: "the-real-key" } }, ctx);
  const serialized = JSON.stringify(result);
  assert(!serialized.includes("the-real-key"), "the credential was echoed back: " + serialized);
  assert(!serialized.includes("639d8cc"), "a secret from the body was echoed: " + serialized);
});

// --- afterConnect -----------------------------------------------------------

Deno.test("api-key: afterConnect labels a single-client connection by name", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ ClientID: "4a397ccaaa55eb4e6aa1221e1e2d7122", Name: "Client One" }],
  }]);
  const meta = await apiKey.afterConnect!({ credential: { apiKey: "k" } } as never, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(pathOf(calls[0].url), `${API_PATH}/clients.json`);
  assertEquals(meta.label, "Campaign Monitor (Client One)");
  assertEquals(meta.clientCount, 1);
});

Deno.test("api-key: afterConnect counts an agency account rather than picking one client", async () => {
  const { ctx } = mockCtx([{
    body: [
      { ClientID: "c1", Name: "Client One" },
      { ClientID: "c2", Name: "Client Two" },
    ],
  }]);
  const meta = await apiKey.afterConnect!({ credential: { apiKey: "k" } } as never, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(meta.label, "Campaign Monitor (2 clients)");
  assertEquals(meta.client, undefined);
});

/** A client-scoped key may be refused /clients.json; that must not fail a good connection. */
Deno.test("api-key: afterConnect is silent when the account list is refused", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody(403, "Not allowed") }]);
  const meta = await apiKey.afterConnect!({ credential: { apiKey: "k" } } as never, ctx);
  assertEquals(meta, {});
});

Deno.test("api-key: afterConnect is silent when the request throws outright", async () => {
  const { ctx } = mockCtx([{ throws: "connection reset" }]);
  const meta = await apiKey.afterConnect!({ credential: { apiKey: "k" } } as never, ctx);
  assertEquals(meta, {});
});

// --- declaration ------------------------------------------------------------

Deno.test("api-key: declares basic auth with exactly one secret field", () => {
  assertEquals(apiKey.key, "api-key");
  assertEquals(apiKey.type, "basic");
  assertEquals(apiKey.fields?.length, 1);
  assertEquals(apiKey.fields?.[0].type, "secret");
  // One field, not a username/password pair: the password is fixed by the vendor.
  assertEquals(apiKey.fields?.[0].key, "apiKey");
});
