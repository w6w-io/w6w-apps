import { assert, assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import {
  buildQuery,
  compact,
  encodeId,
  encodeQueryValue,
  eq,
  formatKeapError,
  joinFilters,
  KeapClient,
  keapErrorCode,
  nextPageToken,
  offsetOf,
  readQuotaHeaders,
  splitHeaderWindows,
  truncate,
} from "../../lib/client.ts";
import { apiErrorBody, emptyQuotaHeaders, faultBody, mockCtx, quotaHeaders } from "../_helpers.ts";

// --- query encoding ---------------------------------------------------------

Deno.test("encodeQueryValue percent-encodes the vendor's filter operators", () => {
  // The exact forms Keap's own examples show: `%3D%3D`, `%3B`, `%2A`.
  assertEquals(encodeQueryValue("given_name==Mary"), "given_name%3D%3DMary");
  assertEquals(encodeQueryValue("a==1;b==2"), "a%3D%3D1%3Bb%3D%3D2");
  assertEquals(encodeQueryValue("Mar*"), "Mar%2A");
});

Deno.test("encodeQueryValue encodes a space as %20, not as +", () => {
  // URLSearchParams would produce `+` here, which is form encoding, not the
  // query encoding Keap's examples use.
  assertEquals(encodeQueryValue("stage_order asc"), "stage_order%20asc");
});

Deno.test("buildQuery drops unset values but keeps false and zero", () => {
  assertEquals(buildQuery({ a: undefined, b: null, c: "" }), "");
  assertEquals(buildQuery({ paid: false, offset: 0 }), "?paid=false&offset=0");
});

Deno.test("buildQuery repeats a key for a list rather than joining it", () => {
  // `update_mask`'s enum members are bare property names, so a comma-joined
  // value is not a member of it. See QueryValue in lib/client.ts.
  assertEquals(
    buildQuery({ update_mask: ["given_name", "job_title"] }),
    "?update_mask=given_name&update_mask=job_title",
  );
});

Deno.test("buildQuery skips empty members of a repeated key", () => {
  assertEquals(buildQuery({ update_mask: ["a", "", "b"] }), "?update_mask=a&update_mask=b");
});

// --- filter grammar ---------------------------------------------------------

Deno.test("eq builds a clause and drops an unset value", () => {
  assertEquals(eq("email", "a@b.com"), "email==a@b.com");
  assertEquals(eq("email", ""), undefined);
  assertEquals(eq("email", undefined), undefined);
  assertEquals(eq("email", null), undefined);
});

Deno.test("eq keeps a numeric zero, which is a legitimate id", () => {
  assertEquals(eq("contact_id", 0), "contact_id==0");
});

Deno.test("joinFilters joins with a semicolon and drops the empties", () => {
  assertEquals(joinFilters(["a==1", undefined, "", "b==2"]), "a==1;b==2");
  assertEquals(joinFilters([undefined, ""]), undefined);
});

// --- ids --------------------------------------------------------------------

Deno.test("encodeId neutralises a pasted path separator", () => {
  assertEquals(encodeId("123"), "123");
  assertEquals(encodeId(" 42 "), "42");
  assertEquals(encodeId("../../users/me"), "..%2F..%2Fusers%2Fme");
  assertEquals(encodeId("a+b@example.com"), "a%2Bb%40example.com");
});

// --- error envelopes --------------------------------------------------------

Deno.test("keapErrorCode reads the gateway fault code", () => {
  assertEquals(
    keapErrorCode(JSON.stringify(faultBody("oauth.v2.InvalidAccessToken", "Invalid access token"))),
    "oauth.v2.InvalidAccessToken",
  );
});

Deno.test("keapErrorCode falls back to the documented Error schema's status", () => {
  assertEquals(
    keapErrorCode(JSON.stringify(apiErrorBody(400, "bad", "INVALID_ARGUMENT"))),
    "INVALID_ARGUMENT",
  );
});

Deno.test("keapErrorCode returns undefined for a non-JSON body", () => {
  assertEquals(keapErrorCode("<html>gateway timeout</html>"), undefined);
});

Deno.test("formatKeapError surfaces the gateway fault, which the OpenAPI never declares", () => {
  const message = formatKeapError(
    401,
    "GET",
    "/rest/v2/contacts",
    JSON.stringify(
      faultBody("keymanagement.service.invalid_access_token", "Invalid Access Token"),
    ),
  );
  assertStringIncludes(message, "keymanagement.service.invalid_access_token");
  assertStringIncludes(message, "Invalid Access Token");
  assertStringIncludes(message, "GET /rest/v2/contacts");
});

Deno.test("formatKeapError surfaces the documented Error schema and its details", () => {
  const message = formatKeapError(
    400,
    "POST",
    "/rest/v2/contacts",
    JSON.stringify(
      apiErrorBody(400, "Invalid request", "INVALID_ARGUMENT", [
        { message: "email_addresses is required" },
      ]),
    ),
  );
  assertStringIncludes(message, "INVALID_ARGUMENT");
  assertStringIncludes(message, "Invalid request");
  assertStringIncludes(message, "email_addresses is required");
});

Deno.test("formatKeapError falls back to the raw body when it is not JSON", () => {
  const message = formatKeapError(502, "GET", "/rest/v2/tags", "<html>bad gateway</html>");
  assertStringIncludes(message, "502");
  assertStringIncludes(message, "bad gateway");
});

Deno.test("formatKeapError adds backoff guidance only on 429", () => {
  const throttled = formatKeapError(
    429,
    "GET",
    "/rest/v2/tags",
    JSON.stringify(faultBody("policies.ratelimit.QuotaViolation", "Rate limit exceeded")),
  );
  assertStringIncludes(throttled, "exponential backoff");
  const notThrottled = formatKeapError(
    404,
    "GET",
    "/rest/v2/tags/9",
    JSON.stringify(apiErrorBody(404, "not found", "NOT_FOUND")),
  );
  assert(!notThrottled.includes("exponential backoff"));
});

Deno.test("truncate keeps a short message and marks a long one", () => {
  assertEquals(truncate("short", 10), "short");
  assertStringIncludes(truncate("x".repeat(50), 10), "bytes truncated");
});

// --- quota headers ----------------------------------------------------------

Deno.test("splitHeaderWindows handles the scalar and the pipe-delimited forms", () => {
  assertEquals(splitHeaderWindows("minute"), ["minute"]);
  assertEquals(splitHeaderWindows("minute|day"), ["minute", "day"]);
  assertEquals(splitHeaderWindows(null), []);
  assertEquals(splitHeaderWindows(undefined), []);
});

Deno.test("readQuotaHeaders reports all three documented families", () => {
  const readings = readQuotaHeaders(new Headers(quotaHeaders()));
  const ids = readings.map((r) => r.id);
  assertEquals(ids, ["product-quota", "product-throttle", "tenant-throttle", "tenant-throttle[1]"]);
});

Deno.test("readQuotaHeaders splits the pipe-delimited tenant throttle into two windows", () => {
  const readings = readQuotaHeaders(new Headers(quotaHeaders()));
  const minute = readings.find((r) => r.id === "tenant-throttle")!;
  const day = readings.find((r) => r.id === "tenant-throttle[1]")!;
  // `Number("10000|250000")` is NaN — this is what the naive read loses.
  assertEquals(minute.limit, 10000);
  assertEquals(minute.available, 9999);
  assertEquals(minute.window, "1 minute");
  assertEquals(day.limit, 250000);
  assertEquals(day.available, 249999);
  assertEquals(day.window, "1 day");
});

Deno.test("readQuotaHeaders reports nothing from the header set an unauthenticated call carries", () => {
  // Every header name present, every number blank. Reporting a zero here would
  // say "quota exhausted" about a request that was never authenticated.
  assertEquals(readQuotaHeaders(new Headers(emptyQuotaHeaders())), []);
});

Deno.test("readQuotaHeaders ignores a family whose headers are absent entirely", () => {
  const readings = readQuotaHeaders(
    new Headers({
      "x-keap-product-quota-limit": "30000",
      "x-keap-product-quota-available": "29000",
      "x-keap-product-quota-time-unit": "day",
      "x-keap-product-quota-interval": "1",
    }),
  );
  assertEquals(readings.length, 1);
  assertEquals(readings[0].id, "product-quota");
});

// --- pagination -------------------------------------------------------------

Deno.test("nextPageToken reads v2's cursor and treats an empty one as absent", () => {
  assertEquals(nextPageToken({ next_page_token: "abc" }), "abc");
  assertEquals(nextPageToken({ next_page_token: "" }), undefined);
  assertEquals(nextPageToken({}), undefined);
  assertEquals(nextPageToken(undefined), undefined);
});

Deno.test("offsetOf reads the offset out of v1's absolute next URL", () => {
  assertEquals(
    offsetOf("https://api.infusionsoft.com/crm/rest/v1/appointments?limit=50&offset=50"),
    50,
  );
  assertEquals(
    offsetOf("https://api.infusionsoft.com/crm/rest/v1/appointments?limit=50"),
    undefined,
  );
  assertEquals(offsetOf(undefined), undefined);
  assertEquals(offsetOf("not a url"), undefined);
});

// --- compact ----------------------------------------------------------------

Deno.test("compact drops unset keys and keeps false and zero", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
});

// --- the client -------------------------------------------------------------

Deno.test("KeapClient builds the one documented origin and prefix", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [] } }]);
  await new KeapClient(ctx).json("/rest/v2/contacts", { query: { page_size: 5 } });
  assertEquals(calls[0].url, "https://api.infusionsoft.com/crm/rest/v2/contacts?page_size=5");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("KeapClient sends a JSON content type only when there is a body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  const client = new KeapClient(ctx);
  await client.json("/rest/v2/tags");
  assertEquals(calls[0].headers["content-type"], undefined);
  await client.json("/rest/v2/tags", { method: "POST", body: { name: "x" } });
  assertEquals(calls[1].headers["content-type"], "application/json");
  assertEquals(calls[1].body, '{"name":"x"}');
});

Deno.test("KeapClient.json returns undefined for 202 and 204, which carry no body", async () => {
  const { ctx } = mockCtx([{ status: 202 }, { status: 204 }]);
  const client = new KeapClient(ctx);
  assertEquals(await client.json("/rest/v2/emails:send", { method: "POST", body: {} }), undefined);
  assertEquals(await client.json("/rest/v2/x", { method: "POST", body: {} }), undefined);
});

Deno.test("KeapClient throws a message carrying the vendor's own machine code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: faultBody("oauth.v2.InvalidAccessToken", "Invalid access token"),
  }]);
  await assertRejects(
    () => new KeapClient(ctx).json("/rest/v2/contacts"),
    Error,
    "oauth.v2.InvalidAccessToken",
  );
});

Deno.test("KeapClient.withHeaders hands back the response headers", async () => {
  const { ctx } = mockCtx([{ body: { email: "a@b.com" }, headers: quotaHeaders() }]);
  const out = await new KeapClient(ctx).withHeaders<{ email: string }>("/rest/v2/x");
  assertEquals(out.body.email, "a@b.com");
  assertEquals(out.headers.get("x-keap-product-quota-limit"), "150000");
});

Deno.test("KeapClient never sets an auth header itself — signing is the auth hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new KeapClient(ctx).json("/rest/v2/contacts");
  assertEquals(calls[0].headers["authorization"], undefined);
});
