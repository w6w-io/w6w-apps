import { assert, assertEquals } from "@std/assert";
import apiToken, {
  authHeaders,
  PROBE_PATH,
  probeUrl,
  TOKEN_REJECTED,
  TOKEN_REPLACEMENT_HINT,
} from "../../auth/api-token.ts";
import { errorBody, mockCtx, queryOf } from "../_helpers.ts";

const TOKEN = "bxt_unitTestFixtureNotARealToken0000000000";

Deno.test("api-token: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.brex.com/v2/users/me",
    headers: {} as Record<string, string>,
  };
  const signed = apiToken.sign!({ request, credential: { apiToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
  // The URL is untouched: the token travels in a header and never in a URL,
  // which a workflow host logs.
  assertEquals(signed.url, "https://api.brex.com/v2/users/me");
  assert(!signed.url.includes(TOKEN));
});

Deno.test("api-token: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiToken: TOKEN }), { authorization: `Bearer ${TOKEN}` });
});

Deno.test("api-token: the probe is the whoami, addressed through one shared constant", () => {
  assertEquals(PROBE_PATH, "/users/me");
  assertEquals(probeUrl(), "https://api.brex.com/v2/users/me");
});

Deno.test("api-token: the declared method is a bearer credential field", () => {
  assertEquals(apiToken.type, "bearer");
  assertEquals(apiToken.connectionLabel, "Brex ({{email}})");
  assertEquals((apiToken.fields ?? []).map((f) => f.key), ["apiToken"]);
});

/** See the file's header: 403 is overloaded, so the BODY decides. */
Deno.test("api-token: TOKEN_REJECTED is anchored on body text, not on a status code", () => {
  assert(TOKEN_REJECTED.test("FORBIDDEN: Invalid or Revoked Token"));
  assert(TOKEN_REJECTED.test("UNAUTHORIZED: PERMISSION_DENIED: Invalid or Revoked Token"));
  assert(TOKEN_REJECTED.test("Expired token"));
  assert(!TOKEN_REJECTED.test("PERMISSION_DENIED: must be a card admin"));
  assert(!TOKEN_REJECTED.test(""));
});

Deno.test("api-token: test passes when the whoami answers", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: "u1", first_name: "Ada", email: "ada@example.com" } },
  ]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, "https://api.brex.com/v2/users/me");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("api-token: test fails with no token, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiToken.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * Measured live on 2026-09-22: a syntactically valid but fake token answers
 * `403 {"type":"FORBIDDEN","message":"Invalid or Revoked Token"}`. A status-code
 * check would call this "forbidden"; the body says the token is dead.
 */
Deno.test("api-token: the measured 403 FORBIDDEN body is reported as a rejected token", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: errorBody("FORBIDDEN", "Invalid or Revoked Token") },
  ]);
  const result = await apiToken.test({ credential: { apiToken: "bxt_garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the token/i.test(result.message ?? ""), result.message);
  assert(result.message?.includes("Invalid or Revoked Token"), result.message);
  assert(result.message?.includes(TOKEN_REPLACEMENT_HINT), result.message);
});

/** Brex's documented 401 body — the same verdict as the 403 above. */
Deno.test("api-token: the documented 401 UNAUTHORIZED body is a rejected token too", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: errorBody("UNAUTHORIZED", "PERMISSION_DENIED: Invalid or Revoked Token"),
    },
  ]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the token/i.test(result.message ?? ""), result.message);
});

/**
 * Brex's error table lists `403` with the message "Expired token" — the same
 * status, a different sentence, and the same fix.
 */
Deno.test("api-token: a 403 saying the token expired is a rejected token, not a refusal", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("FORBIDDEN", "Expired token") }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the token/i.test(result.message ?? ""), result.message);
});

/** A 403 that says nothing about the token is a scope refusal, and is reported as one. */
Deno.test("api-token: a 403 that is not about the token is reported as a refusal", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: errorBody("PERMISSION_DENIED", "Must be a card admin or account admin") },
  ]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/refused/i.test(result.message ?? ""), result.message);
  assert(/scopes/.test(result.message ?? ""), result.message);
  assert(!/rejected the token/i.test(result.message ?? ""), result.message);
});

/**
 * The empty 401. Measured 2026-09-22: with no credential at all, Brex answers
 * `401` with no body — which is a different problem from a bad token, and the
 * message has to say so.
 */
Deno.test("api-token: an empty 401 is reported as a credential that never arrived", async () => {
  const { ctx } = mockCtx([{ status: 401, body: undefined }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/no error body/.test(result.message ?? ""), result.message);
  assert(/never reached/.test(result.message ?? ""), result.message);
});

Deno.test("api-token: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

/**
 * The probe must never echo the credential back. Its response body carries no
 * token field, and the failure paths are built from Brex's own words plus fixed
 * prose — so asserting the token is absent from every message keeps it that way.
 */
Deno.test("api-token: no probe message ever contains the credential", async () => {
  const cases = [
    { status: 200, body: { id: "u1" } },
    { status: 403, body: errorBody("FORBIDDEN", "Invalid or Revoked Token") },
    { status: 401, body: undefined },
    { status: 500, body: "boom" },
  ];
  for (const c of cases) {
    const { ctx } = mockCtx([c]);
    const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);
    assert(
      !JSON.stringify(result).includes(TOKEN),
      `probe echoed the credential: ${JSON.stringify(result)}`,
    );
  }
});

Deno.test("api-token: afterConnect publishes the email and nothing else", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        id: "cu8oi6a6vbc9",
        first_name: "Ada",
        last_name: "Lovelace",
        email: "ada@example.com",
        status: "ACTIVE",
        department_id: "dp_1",
        metadata: { employee_id: "E-1042" },
        custom_fields: [{ key: "cost_owner", value: "finance" }],
      },
    },
  ]);
  const display = await apiToken.afterConnect!({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(display, { email: "ada@example.com" });
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
  // Everything the whoami also returns stays out of the Connection label.
  const rendered = JSON.stringify(display);
  for (const leaked of ["cu8oi6a6vbc9", "Lovelace", "ACTIVE", "dp_1", "cost_owner"]) {
    assert(!rendered.includes(leaked), `afterConnect published ${leaked}`);
  }
});

Deno.test("api-token: afterConnect stays silent when the whoami fails", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("FORBIDDEN", "nope") }]);
  assertEquals(await apiToken.afterConnect!({ credential: { apiToken: TOKEN } }, ctx), {});
});

Deno.test("api-token: afterConnect stays silent when the response carries no email", async () => {
  const { ctx } = mockCtx([{ body: { id: "u1" } }]);
  assertEquals(await apiToken.afterConnect!({ credential: { apiToken: TOKEN } }, ctx), {});
});
