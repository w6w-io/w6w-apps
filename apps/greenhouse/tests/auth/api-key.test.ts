import { assert, assertEquals, assertRejects } from "@std/assert";
import auth from "../../auth/api-key.ts";
import { basicPayload } from "../../auth/token.ts";
import { errorBody, mockCtx, TRANSITION_TOKEN_URL } from "../_helpers.ts";

const HOOK_CTX = mockCtx().ctx;

function tokenResponse(accessToken = "JWT") {
  return { body: { token_type: "Bearer", access_token: accessToken, expires: "3600" } };
}

Deno.test("api-key: the key field is a secret and the method names its own sunset", () => {
  const field = (auth.fields ?? []).find((f) => f.key === "apiKey");
  assertEquals(field?.type, "secret");
  assertEquals(field?.required, true);
  // Greenhouse retires this exchange with v1/v2; a user picking between two auth
  // methods should be able to see that without reading the source.
  assert(auth.displayName.toLowerCase().includes("transitional"), auth.displayName);
  assert(auth.description?.includes("31 August 2026"), auth.description);
});

/**
 * The whole wire-format risk of this method in one assertion: the key goes in
 * the username position with an EMPTY password, so the payload is
 * `base64("key:")`.
 */
Deno.test("api-key exchange: presents the key as Basic with an empty password", async () => {
  const { ctx, calls } = mockCtx([tokenResponse()]);
  const credential = await auth.exchange!({ fields: { apiKey: "harvest-key" } }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls[0].url, TRANSITION_TOKEN_URL);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers.authorization, `Basic ${basicPayload("harvest-key", "")}`);
  assertEquals(credential.accessToken, "JWT");
  assertEquals(credential.apiKey, "harvest-key");
});

/**
 * The key is exchanged for a v3 token and then never used again — no request
 * this app makes to a Harvest resource carries the API key itself, which is what
 * keeps this method on v3 rather than on the API that is being removed.
 */
Deno.test("api-key sign: sends the minted token, never the key", () => {
  const request = { url: "https://harvest.greenhouse.io/v3/jobs", method: "GET", headers: {} };
  const signed = auth.sign!(
    { request, credential: { apiKey: "harvest-key", accessToken: "JWT" } },
    HOOK_CTX,
  ) as { headers: Record<string, string> };
  assertEquals(signed.headers["authorization"], "Bearer JWT");
  assert(!JSON.stringify(signed).includes("harvest-key"));
});

Deno.test("api-key exchange: refuses an empty key before spending a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(auth.exchange!({ fields: {} }, ctx)),
    Error,
    "Harvest API key is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("api-key refresh: re-mints from the stored key", async () => {
  const { ctx, calls } = mockCtx([tokenResponse("JWT2")]);
  const credential = await auth.refresh!(
    { credential: { apiKey: "harvest-key", accessToken: "OLD" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].url, TRANSITION_TOKEN_URL);
  assertEquals(credential.accessToken, "JWT2");
});

Deno.test("api-key test: a mint plus a clean probe is a pass", async () => {
  const { ctx, calls } = mockCtx([tokenResponse(), { body: [{ id: 1 }] }]);
  assertEquals(await auth.test({ credential: { apiKey: "k" } }, ctx), { ok: true });
  assertEquals(calls.length, 2);
});

/**
 * Harvest keys carry per-endpoint permissions and the vendor's own guidance is
 * to grant only what is needed, so a 403 is a normal configuration rather than a
 * broken key.
 */
Deno.test("api-key test: an endpoint the key is not permitted on is still a pass", async () => {
  const { ctx } = mockCtx([tokenResponse(), { status: 403, body: errorBody("Forbidden") }]);
  const result = await auth.test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(result.ok, true);
  assert(result.message?.includes("Credential is live"), result.message);
});

/** The measured rejection body for a wrong key at the transition endpoint. */
Deno.test("api-key test: a rejected key is reported as a bad key, not an outage", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Invalid credentials") }]);
  const result = await auth.test({ credential: { apiKey: "wrong-key" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("API Credential Management"), result.message);
  assert(!result.message?.includes("wrong-key"), result.message);
});

Deno.test("api-key test: an empty credential fails without touching the network", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential is missing apiKey — reconnect",
  });
  assertEquals(calls.length, 0);
});
