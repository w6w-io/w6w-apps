import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  API_BASE,
  API_PREFIX,
  CampaignMonitorClient,
  CODE_MEANINGS,
  compactQuery,
  CREDENTIAL_FAILURE_CODES,
  encodeId,
  formatError,
  readErrorCode,
  stripSecrets,
  truncate,
} from "../../lib/client.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client: the base and prefix are the documented ones", () => {
  assertEquals(API_BASE, "https://api.createsend.com");
  // createsend.com, NOT campaignmonitor.com — the docs live on the other host.
  assertEquals(new URL(API_BASE).hostname, "api.createsend.com");
  assertEquals(API_PREFIX, "/api/v3.3");
});

// --- the .json extension ----------------------------------------------------

/**
 * XML is this API's default outside /transactional. Belt AND braces: the
 * extension is built into the path and `accept: application/json` is sent, so
 * neither alone can be dropped by accident.
 */
Deno.test("client: json() appends .json and asks for JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new CampaignMonitorClient(ctx).json("/clients");
  assertEquals(pathOf(calls[0].url), "/api/v3.3/clients.json");
  assertEquals(calls[0].headers["accept"], "application/json");
});

/**
 * /transactional takes NO extension — appending one 404s — and its segments are
 * camelCase. That asymmetry lives in one place so no call site can get it wrong.
 */
Deno.test("client: transactional() appends no extension", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new CampaignMonitorClient(ctx).transactional("/smartEmail");
  assertEquals(pathOf(calls[0].url), "/api/v3.3/transactional/smartEmail");
  assert(!pathOf(calls[0].url).endsWith(".json"));
});

// --- request shaping --------------------------------------------------------

Deno.test("client: a body is JSON-encoded with a content-type; a GET sends neither", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  const client = new CampaignMonitorClient(ctx);

  await client.json("/x", { method: "POST", body: { A: 1 } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ A: 1 }));

  await client.json("/y");
  assertEquals(calls[1].headers["content-type"], undefined);
  assertEquals(calls[1].body, null);
});

Deno.test("client: an empty response body becomes undefined rather than a parse error", async () => {
  const { ctx } = mockCtx([{ status: 200 }]);
  assertEquals(await new CampaignMonitorClient(ctx).json("/x", { method: "DELETE" }), undefined);
});

/**
 * `false` and `0` survive; only undefined, null and "" are dropped. Sending
 * `includetrackingpreference=false` is a different statement from omitting it,
 * and `page=0` earns a legible code 800 rather than silently paging from 1.
 */
Deno.test("client: compactQuery keeps false and 0, drops undefined, null and empty", () => {
  assertEquals(
    compactQuery({ a: false, b: 0, c: undefined, d: null, e: "", f: "x", g: 1 }),
    { a: "false", b: "0", f: "x", g: "1" },
  );
});

Deno.test("client: query values reach the URL through compactQuery", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new CampaignMonitorClient(ctx).json("/x", {
    query: { page: 1, pagesize: undefined, includetrackingpreference: false },
  });
  assertEquals(queryOf(calls[0].url), { page: "1", includetrackingpreference: "false" });
});

// --- id escaping ------------------------------------------------------------

Deno.test("client: encodeId neutralises path separators and query characters", () => {
  assertEquals(encodeId("4a397ccaaa55eb4e6aa1221e1e2d7122"), "4a397ccaaa55eb4e6aa1221e1e2d7122");
  assertEquals(encodeId("  padded  "), "padded");
  assertEquals(encodeId("a/b"), "a%2Fb");
  assertEquals(encodeId("a?b=c"), "a%3Fb%3Dc");
  assertEquals(encodeId("../admins"), "..%2Fadmins");
});

// --- error classification ---------------------------------------------------

/**
 * The single most expensive thing to get wrong about this API: the HTTP status
 * is not the classifier. Every code the app interprets is glossed, and 102 is
 * deliberately NOT a credential failure.
 */
Deno.test("client: 102 is not a credential failure, while 100/120/121/122 are", () => {
  assertEquals([...CREDENTIAL_FAILURE_CODES].sort((a, b) => a - b), [100, 120, 121, 122]);
  assert(!CREDENTIAL_FAILURE_CODES.has(102), "code 102 is a wrong resource id, not a bad key");
  assert(!CREDENTIAL_FAILURE_CODES.has(403), "code 403 means the credential was accepted");
  // Every credential-failure code carries a gloss a reader can act on.
  for (const code of CREDENTIAL_FAILURE_CODES) {
    assert(typeof CODE_MEANINGS[code] === "string", `no gloss for code ${code}`);
  }
});

Deno.test("client: formatError names the status, the code, the vendor message and the gloss", () => {
  const message = formatError(
    401,
    "GET",
    "/api/v3.3/clients.json",
    JSON.stringify(errorBody(102, "Invalid ClientID")),
  );
  assert(message.includes("401"), message);
  assert(message.includes("code 102"), message);
  assert(message.includes("GET /api/v3.3/clients.json"), message);
  assert(message.includes("Invalid ClientID"), message);
  assert(message.includes(CODE_MEANINGS[102]), message);
});

/**
 * A partial bulk import arrives as a 400 whose ResultData names each failed
 * address. Dropping it would throw away the only record of what landed.
 */
Deno.test("client: formatError keeps ResultData", () => {
  const message = formatError(
    400,
    "POST",
    "/api/v3.3/subscribers/lid/import.json",
    JSON.stringify({
      Code: 210,
      Message: "Subscriber Import had some failures",
      ResultData: { FailureDetails: [{ EmailAddress: "bad@", Code: 1 }] },
    }),
  );
  assert(message.includes("bad@"), message);
  assert(message.includes("details:"), message);
});

/** An XML or HTML body must not be mistaken for a code — the raw text is honest. */
Deno.test("client: formatError falls back to the raw body when it is not JSON", () => {
  const message = formatError(502, "GET", "/api/v3.3/clients.json", "<html>bad gateway</html>");
  assert(message.includes("502"), message);
  assert(message.includes("bad gateway"), message);
  assert(!message.includes("code "), "no code may be invented: " + message);
});

Deno.test("client: readErrorCode reads a numeric Code and refuses to guess otherwise", () => {
  assertEquals(readErrorCode(JSON.stringify(errorBody(100, "Invalid API Key"))), 100);
  assertEquals(readErrorCode('{"Message":"no code"}'), undefined);
  assertEquals(readErrorCode("<html/>"), undefined);
  assertEquals(readErrorCode('{"Code":"100"}'), undefined);
});

Deno.test("client: a non-2xx throws with the formatted message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody(100, "Invalid API Key") }]);
  const err = await assertRejects(
    async () => await new CampaignMonitorClient(ctx).json("/clients"),
    Error,
  );
  assert(err.message.includes("code 100"), err.message);
  assert(err.message.includes("/api/v3.3/clients.json"), err.message);
});

Deno.test("client: truncate caps a long body and says how much it dropped", () => {
  assertEquals(truncate("short", 600), "short");
  const long = "x".repeat(1000);
  const out = truncate(long, 10);
  assert(out.startsWith("xxxxxxxxxx"), out);
  assert(out.includes("1000 bytes truncated"), out);
});

// --- redaction --------------------------------------------------------------

/**
 * `GET /clients/{clientid}.json` returns a live client key. This is the one
 * field the app deletes, and it is deleted rather than masked.
 */
Deno.test("client: stripSecrets deletes ApiKey and leaves everything else alone", () => {
  const response = {
    ApiKey: "639d8cc27198202f5fe6037a8b17a29a59984b86d3289bc9",
    BasicDetails: { ClientID: "c1", CompanyName: "Client One" },
    BillingDetails: { Credits: 500 },
  };
  const out = stripSecrets(response) as Record<string, unknown>;
  assert(!("ApiKey" in out), "masked rather than deleted");
  assert(!JSON.stringify(out).includes("639d8cc"), "the key survived");
  assertEquals(out.BasicDetails, response.BasicDetails);
  assertEquals(out.BillingDetails, response.BillingDetails);
  // Non-destructive: the caller's own object is untouched.
  assertEquals(response.ApiKey, "639d8cc27198202f5fe6037a8b17a29a59984b86d3289bc9");
});

Deno.test("client: stripSecrets passes non-objects through unchanged", () => {
  assertEquals(stripSecrets(null), null);
  assertEquals(stripSecrets(undefined), undefined);
  assertEquals(stripSecrets("a string"), "a string");
  assertEquals(stripSecrets([1, 2]), [1, 2]);
});
