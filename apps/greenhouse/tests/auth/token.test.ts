import { assert, assertEquals } from "@std/assert";
import {
  basicPayload,
  classifyTokenFailure,
  expiresAtFrom,
  FALLBACK_TTL_SECONDS,
  mintClientCredentialsToken,
  mintTransitionToken,
  probeWithToken,
  RENEW_HEADROOM_SECONDS,
  scrub,
} from "../../auth/token.ts";
import { AUTH_TOKEN_URL, errorBody, mockCtx, TRANSITION_TOKEN_URL } from "../_helpers.ts";

/**
 * Pinned against Greenhouse's own v1 sample, which encodes
 * `a7183e1b7e9ab09b8a5cfa87d1934c3c:` — note the trailing colon. The published
 * result is `YTcxODNlMWI3ZTlhYjA5YjhhNWNmYTg3ZDE5MzRjM2M6`, and the doc spells
 * out why: "you'll need to append a `:` (colon) to your Greenhouse API token and
 * then Base64 encode the resulting string".
 */
Deno.test("basicPayload: matches Greenhouse's published sample for an empty password", () => {
  assertEquals(
    basicPayload("a7183e1b7e9ab09b8a5cfa87d1934c3c", ""),
    "YTcxODNlMWI3ZTlhYjA5YjhhNWNmYTg3ZDE5MzRjM2M6",
  );
});

/**
 * `bamboohr` in this same pack is also key-as-username Basic but pins the
 * password to `x`. One character apart on the wire, not interchangeable — which
 * is why this is asserted rather than assumed.
 */
Deno.test("basicPayload: an empty password is not the same wire value as a throwaway one", () => {
  assert(basicPayload("key", "") !== basicPayload("key", "x"));
});

Deno.test("scrub: removes every held secret, wherever it appears", () => {
  const message = "client_id=abcdef-4 does not contain a valid client ID suffix";
  assertEquals(
    scrub(message, ["abcdef-4", undefined]),
    "client_id=<redacted> does not contain a valid client ID suffix",
  );
});

/**
 * Short strings are skipped deliberately: a two-character "secret" would match
 * inside ordinary words and redact the whole message into noise.
 */
Deno.test("scrub: leaves text alone when no secret is long enough to match", () => {
  assertEquals(scrub("nothing to hide", ["ab", "", undefined]), "nothing to hide");
});

Deno.test("expiresAtFrom: prefers expires_in and renews a minute early", () => {
  const now = Date.parse("2026-08-11T00:00:00.000Z");
  assertEquals(
    expiresAtFrom({ expires_in: 3600 }, now),
    new Date(now + (3600 - RENEW_HEADROOM_SECONDS) * 1000).toISOString(),
  );
});

/**
 * The transition endpoint names the field `expires` and declares it only as a
 * string, so both plausible readings are handled rather than one guessed at.
 */
Deno.test("expiresAtFrom: reads the transition endpoint's `expires` as seconds or as a date", () => {
  const now = Date.parse("2026-08-11T00:00:00.000Z");
  assertEquals(
    expiresAtFrom({ expires: "1800" }, now),
    new Date(now + (1800 - RENEW_HEADROOM_SECONDS) * 1000).toISOString(),
  );
  assertEquals(
    expiresAtFrom({ expires: "2026-08-11T01:00:00.000Z" }, now),
    new Date(now + (3600 - RENEW_HEADROOM_SECONDS) * 1000).toISOString(),
  );
});

Deno.test("expiresAtFrom: an unreadable TTL falls back to the documented hour", () => {
  const now = Date.parse("2026-08-11T00:00:00.000Z");
  assertEquals(
    expiresAtFrom({ expires: "who knows" }, now),
    new Date(now + (FALLBACK_TTL_SECONDS - RENEW_HEADROOM_SECONDS) * 1000).toISOString(),
  );
  assertEquals(expiresAtFrom({}, now), expiresAtFrom({ expires: "who knows" }, now));
});

/**
 * The measured taxonomy. A rejected client id arrives as 400 and a rejected
 * secret as 401, so these cases are keyed off the body and the status is only
 * ever quoted.
 */
Deno.test("classifyTokenFailure: an RFC 6749 invalid_client is read as a bad credential", () => {
  const message = classifyTokenFailure(401, { error: "invalid_client" });
  assert(message.includes("invalid_client"), message);
  assert(message.includes("rejected the credential"), message);
});

Deno.test("classifyTokenFailure: a malformed client id is a 400 and says what to fix", () => {
  const message = classifyTokenFailure(400, {
    message: "client_id=notaclient does not contain a valid client ID suffix",
  });
  assert(message.includes("suffix"), message);
  assert(!message.includes("outage"), message);
});

Deno.test("classifyTokenFailure: a bare Unauthorized means no credential reached Greenhouse", () => {
  const message = classifyTokenFailure(401, { message: "Unauthorized", errorId: "err-1" });
  assert(message.includes("saw no credential"), message);
});

Deno.test("classifyTokenFailure: the transition endpoint's rejection points at Dev Center", () => {
  const message = classifyTokenFailure(401, { message: "Invalid credentials" });
  assert(message.includes("Harvest API key"), message);
  assert(message.includes("API Credential Management"), message);
});

Deno.test("classifyTokenFailure: a grant-type complaint is owned as this app's bug", () => {
  const message = classifyTokenFailure(400, {
    message: "grant_type=not_a_grant is invalid, please use one of: client_credentials",
  });
  assert(message.includes("this app's bug"), message);
});

Deno.test("mintClientCredentialsToken: posts the guide's form body with Basic client creds", async () => {
  const { ctx, calls } = mockCtx([{
    body: { token_type: "Bearer", access_token: "JWT", expires_in: 3600 },
  }]);
  const token = await mintClientCredentialsToken(ctx, {
    clientId: "cid-4",
    clientSecret: "csecret",
    sub: 12345,
  });

  assertEquals(calls[0].url, AUTH_TOKEN_URL);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].headers.authorization, `Basic ${basicPayload("cid-4", "csecret")}`);
  assertEquals(calls[0].body, "grant_type=client_credentials&sub=12345");
  assertEquals(token.accessToken, "JWT");
});

Deno.test("mintClientCredentialsToken: omits sub entirely when it is blank", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "JWT", expires_in: 60 } }]);
  await mintClientCredentialsToken(ctx, { clientId: "cid-4", clientSecret: "s", sub: "  " });
  assertEquals(calls[0].body, "grant_type=client_credentials");
});

/**
 * The failure that matters most: the vendor's message quotes the client id back,
 * and a `test` result is stored and displayed.
 */
Deno.test("mintClientCredentialsToken: the thrown message never contains the credential", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { message: "client_id=supersecretid-4 does not contain a valid client ID suffix" },
  }]);
  let caught: Error | undefined;
  try {
    await mintClientCredentialsToken(ctx, { clientId: "supersecretid-4", clientSecret: "s" });
  } catch (error) {
    caught = error as Error;
  }
  assert(caught, "expected a throw");
  assert(!caught!.message.includes("supersecretid-4"), caught!.message);
  assert(caught!.message.includes("suffix"), caught!.message);
});

Deno.test("mintTransitionToken: Basic-authenticates the API key with an EMPTY password", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "JWT", expires: "3600" } }]);
  await mintTransitionToken(ctx, { apiKey: "harvest-key" });

  assertEquals(calls[0].url, TRANSITION_TOKEN_URL);
  assertEquals(calls[0].headers.authorization, `Basic ${basicPayload("harvest-key", "")}`);
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, "{}");
});

Deno.test("mintTransitionToken: a 200 without an access_token is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { token_type: "Bearer" } }]);
  let caught: Error | undefined;
  try {
    await mintTransitionToken(ctx, { apiKey: "k" });
  } catch (error) {
    caught = error as Error;
  }
  assert(caught?.message.includes("without an access_token"), caught?.message);
});

Deno.test("probeWithToken: a 200 is a pass", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }] }]);
  assertEquals(await probeWithToken(ctx, "JWT"), { ok: true });
  assertEquals(calls[0].headers.authorization, "Bearer JWT");
});

/**
 * The load-bearing case. v3 authorises in two layers, and every v3 GET wants a
 * Site Admin subject — so a live credential legitimately answers 403 here, and
 * failing it would report a working connection as broken.
 */
Deno.test("probeWithToken: a 403 is a PASS, with the reason explained", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("Forbidden") }]);
  const result = await probeWithToken(ctx, "JWT");
  assertEquals(result.ok, true);
  assert(result.message?.includes("Site Admin"), result.message);
});

Deno.test("probeWithToken: a 401 after a successful mint is a failure", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("Unauthorized", ["Token could not be decoded."]),
  }]);
  const result = await probeWithToken(ctx, "JWT");
  assertEquals(result.ok, false);
  assert(result.message?.includes("refused it"), result.message);
});

/**
 * v3 routes before it authenticates, so a 404 on a documented path is a
 * statement about the endpoint, not about the credential.
 */
Deno.test("probeWithToken: a 404 is reported as a missing endpoint, not a bad credential", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("Resource not found") }]);
  const result = await probeWithToken(ctx, "JWT");
  assertEquals(result.ok, false);
  assert(result.message?.includes("endpoint is gone"), result.message);
});
