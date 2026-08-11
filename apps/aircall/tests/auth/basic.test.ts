import { assert, assertEquals } from "@std/assert";
import basic, { basicHeader, classifyProbe, PROBE_PATH } from "../../auth/basic.ts";
import type { HookContext, SignableRequest } from "@w6w/types";
import { edgeErrorBody, mockCtx, pathOf } from "../_helpers.ts";

const CRED = { apiId: "my_api_id", apiToken: "my_api_token" };

Deno.test("basic: sign stamps the Base64 pair on the Authorization header", () => {
  const request = { url: "https://api.aircall.io/v1/calls", method: "GET", headers: {} };
  const signed = basic.sign!(
    { request: request as unknown as SignableRequest, credential: CRED },
    {} as HookContext,
  ) as SignableRequest;

  // `base64("my_api_id:my_api_token")`, the exact construction the reference
  // describes: id and token joined by ONE colon, then Base64.
  assertEquals(signed.headers["authorization"], `Basic ${btoa("my_api_id:my_api_token")}`);
});

/**
 * Aircall also accepts `https://api_id:api_token@api.aircall.io` and warns
 * against it: "URLs are often stored in browser history and server logs." A
 * workflow host logs request URLs and does not log request headers, so the
 * credential must never reach the URL.
 */
Deno.test("basic: sign never touches the request URL", () => {
  const request = { url: "https://api.aircall.io/v1/calls", method: "GET", headers: {} };
  const signed = basic.sign!(
    { request: request as unknown as SignableRequest, credential: CRED },
    {} as HookContext,
  ) as SignableRequest;

  assertEquals(signed.url, "https://api.aircall.io/v1/calls");
  assert(!signed.url.includes("my_api_id"), signed.url);
  assert(!signed.url.includes("my_api_token"), signed.url);
});

Deno.test("basic: the probe is GET /v1/ping and carries the signed header", async () => {
  const { ctx, calls } = mockCtx([{ body: { ping: "pong" } }]);
  const out = await basic.test({ credential: CRED }, ctx);

  assertEquals(out.ok, true);
  assertEquals(calls.length, 1);
  assertEquals(pathOf(calls[0].url), "/v1/ping");
  assertEquals(calls[0].headers["authorization"], basicHeader(CRED));
});

Deno.test("basic: a missing half fails without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await basic.test({ credential: { apiId: "only-the-id" } }, ctx);

  assertEquals(out.ok, false);
  assert(out.message!.includes("missing apiId or apiToken"), out.message);
  assertEquals(calls.length, 0);
});

/**
 * The finding this whole auth method is built around, pinned both ways.
 *
 * Measured 2026-08-11 against `api.aircall.io`: no credential answers
 * `401 {"message":"Unauthorized"}`, a bogus pair answers
 * `403 {"message":"Forbidden"}`. Aircall's own per-endpoint tables agree —
 * "403 — Forbidden. Invalid API key or Bearer access token" — and 401 never
 * appears in the documented table. Classifying 403 the conventional way
 * ("authenticated but not permitted") reports a dead credential as a live one.
 */
Deno.test("basic: 401 is read as 'the credential never arrived'", async () => {
  const { ctx } = mockCtx([{ status: 401, body: edgeErrorBody("Unauthorized") }]);
  const out = await basic.test({ credential: CRED }, ctx);

  assertEquals(out.ok, false);
  assert(out.message!.includes("no Authorization header"), out.message);
  assert(out.message!.includes("reconnect"), out.message);
});

Deno.test("basic: 403 is read as 'the credential is wrong', not 'no permission'", async () => {
  const { ctx } = mockCtx([{ status: 403, body: edgeErrorBody("Forbidden") }]);
  const out = await basic.test({ credential: CRED }, ctx);

  assertEquals(out.ok, false);
  assert(out.message!.includes("rejected the API ID / API token pair"), out.message);
  assert(
    out.message!.includes("not for a missing permission"),
    `403 must not be reported as a scope problem: ${out.message}`,
  );
});

/**
 * A 429 and a 5xx are verdicts about Aircall, not about the credential. Saying
 * "your token is bad" for either sends someone to rotate a working key.
 */
Deno.test("basic: 429 and 5xx do not blame the credential", () => {
  const limited = classifyProbe(429, null);
  assert(limited.includes("says nothing about the credential"), limited);

  const broken = classifyProbe(503, null);
  assert(broken.includes("not a verdict on the credential"), broken);
});

Deno.test("basic: classifyProbe reads both error-body shapes", () => {
  // The documented application-tier shape.
  const documented = classifyProbe(403, { error: "Forbidden", troubleshoot: "Invalid API key" });
  assert(documented.includes("Invalid API key"), documented);
  // The measured edge shape, which the documentation never mentions.
  const edge = classifyProbe(403, { message: "Forbidden" });
  assert(edge.includes("Forbidden"), edge);
});

/**
 * The probe must not be swapped for a list read. `GET /v1/webhooks` is the
 * tempting alternative — it proves list access works too — and it returns every
 * webhook's shared authentication token in the process.
 */
Deno.test("basic: the probe path is /ping and nothing else", () => {
  assertEquals(PROBE_PATH, "/ping");
});

Deno.test("basic: both credential halves are declared secret", () => {
  assertEquals(basic.key, "basic");
  assertEquals(basic.type, "basic");
  const keys = (basic.fields ?? []).map((f) => f.key).sort();
  assertEquals(keys, ["apiId", "apiToken"]);
  for (const f of basic.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: half of a Basic pair is still credential material`);
  }
});

/**
 * `afterConnect` is deliberately absent — the only endpoint that names an
 * Aircall account is `GET /v1/company`, which also returns the organisation's
 * user and number counts, and that is a lot to copy into ambient Connection
 * metadata for a display string. Asserted so its absence stays a decision.
 */
Deno.test("basic: declares no afterConnect", () => {
  assertEquals(basic.afterConnect, undefined);
});
