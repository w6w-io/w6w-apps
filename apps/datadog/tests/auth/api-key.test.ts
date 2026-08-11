import { assert, assertEquals } from "@std/assert";
import apiKey, {
  authHeaders,
  CURRENT_USER_PATH,
  readCurrentUserResponse,
  readValidateResponse,
  VALIDATE_PATH,
} from "../../auth/api-key.ts";
import { siteById } from "../../lib/sites.ts";
import { EU1, mockCtx, US1 } from "../_helpers.ts";

const us1 = siteById("us1")!;
const eu1 = siteById("eu1")!;

const CRED = { site: "us1", apiKey: "k-123", appKey: "a-456" };
const API_ONLY = { site: "us1", apiKey: "k-123" };

Deno.test("auth: sign stamps both headers, lowercased", () => {
  const request = {
    url: `${US1}/api/v1/monitor`,
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: CRED }, mockCtx().ctx) as typeof request;
  assertEquals(signed.headers["dd-api-key"], "k-123");
  assertEquals(signed.headers["dd-application-key"], "a-456");
});

/**
 * An empty `DD-APPLICATION-KEY` is not the same as no header: Datadog reads a
 * present-but-empty application key as one to reject, so a submission-only
 * connection would start failing endpoints that need no application key at all.
 */
Deno.test("auth: the application-key header is omitted, not blanked, when absent", () => {
  assertEquals(authHeaders(API_ONLY), { "dd-api-key": "k-123" });
  assertEquals(authHeaders({ ...API_ONLY, appKey: "   " }), { "dd-api-key": "k-123" });
  assert(!("dd-application-key" in authHeaders(API_ONLY)));
});

Deno.test("auth: keys are trimmed, because pasted keys carry whitespace", () => {
  assertEquals(authHeaders({ apiKey: " k ", appKey: " a " }), {
    "dd-api-key": "k",
    "dd-application-key": "a",
  });
});

// --- the verdict comes from the body -----------------------------------------

/**
 * The core of this app's auth story. `/api/v1/validate` answers a byte-identical
 * 403 for a missing key, a well-formed fake key and a garbage key (measured
 * 2026-08-11), so only the positive body is informative.
 */
Deno.test("auth: only 200 with {valid:true} passes the API-key probe", () => {
  assertEquals(readValidateResponse(200, { valid: true }, us1), { ok: true });
  assertEquals(readValidateResponse(200, { valid: false }, us1).ok, false);
  assertEquals(readValidateResponse(200, null, us1).ok, false);
  assertEquals(readValidateResponse(403, { errors: ["Forbidden"] }, us1).ok, false);
  assertEquals(readValidateResponse(401, { errors: ["Unauthorized"] }, us1).ok, false);
  assertEquals(readValidateResponse(429, null, us1).ok, false);
  assertEquals(readValidateResponse(500, null, us1).ok, false);
});

Deno.test("auth: a refusal names the wrong-site possibility, because 403 hides it", () => {
  const message = readValidateResponse(403, { errors: ["Forbidden"] }, eu1).message ?? "";
  assert(message.includes("EU1 (datadoghq.eu)"), message);
  assert(message.includes("another Datadog site"), message);
  assert(message.includes("identical 403"), message);
});

Deno.test("auth: the application-key probe reads data.type, not the status alone", () => {
  assertEquals(readCurrentUserResponse(200, { data: { type: "users", id: "u1" } }, us1), {
    ok: true,
  });
  // A 200 that is not a user record means something else is answering.
  assertEquals(readCurrentUserResponse(200, { data: { type: "orgs" } }, us1).ok, false);
  assertEquals(readCurrentUserResponse(200, "<html>login</html>", us1).ok, false);
});

Deno.test("auth: 401 and 403 on the app-key probe get different explanations", () => {
  const noCred = readCurrentUserResponse(401, { errors: ["Unauthorized"] }, us1).message ?? "";
  assert(noCred.includes("no credential"), noCred);
  const refused = readCurrentUserResponse(403, { errors: ["Forbidden"] }, us1).message ?? "";
  assert(refused.includes("application key"), refused);
  assert(refused.includes("Forbidden"), refused);
});

// --- the test hook end to end ------------------------------------------------

Deno.test("auth: test probes validate, then current_user, on the connection's site", async () => {
  const { ctx, calls } = mockCtx([
    { body: { valid: true } },
    { body: { data: { type: "users", id: "u1" } } },
  ]);
  const result = await apiKey.test({ credential: { ...CRED, site: "eu1" } }, ctx);

  assertEquals(calls.length, 2);
  assertEquals(calls[0].url, `${EU1}${VALIDATE_PATH}`);
  assertEquals(calls[1].url, `${EU1}${CURRENT_USER_PATH}`);
  assertEquals(calls[0].headers["dd-api-key"], "k-123");
  assertEquals(result, { ok: true });
});

/**
 * A connection with no application key is a valid, useful connection — it can
 * submit metrics and events — so `test` passes it and says what it cannot do,
 * rather than failing it or claiming it is fully working.
 */
Deno.test("auth: an API-key-only connection passes with an explicit limitation", async () => {
  const { ctx, calls } = mockCtx([{ body: { valid: true } }]);
  const result = await apiKey.test({ credential: API_ONLY }, ctx) as {
    ok: boolean;
    message?: string;
  };

  assertEquals(calls.length, 1, "it must not probe current_user without an application key");
  assertEquals(result.ok, true);
  assert(result.message?.includes("every read action will be refused"), result.message);
});

Deno.test("auth: a bad API key fails before the application key is ever probed", async () => {
  const { ctx, calls } = mockCtx([{ status: 403, body: { errors: ["Forbidden"] } }]);
  const result = await apiKey.test({ credential: CRED }, ctx) as { ok: boolean };
  assertEquals(calls.length, 1);
  assertEquals(result.ok, false);
});

Deno.test("auth: a good API key with a refused application key fails, and says which", async () => {
  const { ctx } = mockCtx([
    { body: { valid: true } },
    { status: 403, body: { errors: ["Forbidden"] } },
  ]);
  const result = await apiKey.test({ credential: CRED }, ctx) as {
    ok: boolean;
    message?: string;
  };
  assertEquals(result.ok, false);
  assert(result.message?.includes("application key"), result.message);
});

Deno.test("auth: a missing or unknown site fails without a request", async () => {
  const noSite = mockCtx([]);
  const a = await apiKey.test({ credential: { apiKey: "k" } }, noSite.ctx) as { ok: boolean };
  assertEquals(a.ok, false);
  assertEquals(noSite.calls.length, 0);

  const badSite = mockCtx([]);
  const b = await apiKey.test({ credential: { site: "atlantis", apiKey: "k" } }, badSite.ctx) as {
    ok: boolean;
    message?: string;
  };
  assertEquals(b.ok, false);
  assert(b.message?.includes("not a Datadog site"), b.message);
  assertEquals(badSite.calls.length, 0);
});

Deno.test("auth: a missing API key fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: { site: "us1", apiKey: "  " } }, ctx) as {
    ok: boolean;
  };
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

// --- afterConnect ------------------------------------------------------------

/**
 * The site is published from the credential field before any network call, so a
 * failed org lookup can never leave an EU1 connection quietly addressing US1.
 */
Deno.test("afterConnect: the site is published even when the org lookup fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { errors: ["boom"] } }]);
  const display = await apiKey.afterConnect!({ credential: { ...CRED, site: "eu1" } }, ctx);
  assertEquals(display.site, "eu1");
  assertEquals(display.apiHost, "api.datadoghq.eu");
  assertEquals(display.org, undefined);
});

Deno.test("afterConnect: the org name comes from the included array, and nothing else does", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: {
        type: "users",
        id: "u1",
        attributes: { name: "Ada", email: "ada@example.com", mfa_enabled: true },
      },
      included: [
        { type: "roles", id: "r1", attributes: { name: "Datadog Admin Role" } },
        { type: "orgs", id: "org-9", attributes: { name: "Acme" } },
      ],
    },
  }]);
  const display = await apiKey.afterConnect!({ credential: CRED }, ctx);

  assertEquals(display.site, "us1");
  assertEquals(display.org, { name: "Acme", publicId: "org-9" });
  // The user's own name, email and MFA state are deliberately not published.
  assertEquals(JSON.stringify(display).includes("ada@example.com"), false);
  assertEquals(JSON.stringify(display).includes("Ada"), false);
});

Deno.test("afterConnect: an API-key-only connection publishes the site without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const display = await apiKey.afterConnect!({ credential: API_ONLY }, ctx);
  assertEquals(display, { site: "us1", apiHost: "api.datadoghq.com" });
  assertEquals(calls.length, 0);
});
