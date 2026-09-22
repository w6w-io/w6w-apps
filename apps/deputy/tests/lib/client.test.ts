import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  asOptionalJson,
  baseUrlFromConnection,
  compact,
  csv,
  DeputyClient,
  errorMessage,
  host,
  MAX_PAGE_SIZE,
  normalizeBaseUrl,
  parseInstall,
  resourcePath,
  sameHost,
} from "../../lib/client.ts";
import { BASE_URL, mockCtx } from "../_helpers.ts";

Deno.test("normalizeBaseUrl: adds https when no scheme given", () => {
  assertEquals(
    normalizeBaseUrl("simonssambos.au.deputy.com"),
    "https://simonssambos.au.deputy.com",
  );
});

Deno.test("normalizeBaseUrl: keeps an explicit http scheme", () => {
  assertEquals(
    normalizeBaseUrl("http://simonssambos.au.deputy.com"),
    "http://simonssambos.au.deputy.com",
  );
});

Deno.test("normalizeBaseUrl: strips a trailing slash", () => {
  assertEquals(
    normalizeBaseUrl("https://simonssambos.au.deputy.com/"),
    "https://simonssambos.au.deputy.com",
  );
});

Deno.test("normalizeBaseUrl: strips a pasted /api/v1/me suffix", () => {
  assertEquals(
    normalizeBaseUrl("https://simonssambos.au.deputy.com/api/v1/me"),
    "https://simonssambos.au.deputy.com",
  );
});

Deno.test("normalizeBaseUrl: strips a pasted /api/v1 suffix", () => {
  assertEquals(
    normalizeBaseUrl("https://simonssambos.au.deputy.com/api/v1"),
    "https://simonssambos.au.deputy.com",
  );
});

Deno.test("normalizeBaseUrl: strips a pasted bare /api suffix", () => {
  assertEquals(
    normalizeBaseUrl("https://simonssambos.au.deputy.com/api"),
    "https://simonssambos.au.deputy.com",
  );
});

Deno.test("normalizeBaseUrl: rejects an empty string", () => {
  assertThrows(() => normalizeBaseUrl(""), Error, "empty");
});

Deno.test("normalizeBaseUrl: rejects garbage that is not a URL", () => {
  assertThrows(() => normalizeBaseUrl("http://"), Error);
});

Deno.test("parseInstall: splits install and region off a standard host", () => {
  assertEquals(parseInstall("https://simonssambos.au.deputy.com"), {
    install: "simonssambos",
    region: "au",
  });
});

Deno.test("parseInstall: returns nothing for a non-deputy.com host", () => {
  assertEquals(parseInstall("https://example.com"), {});
});

Deno.test("parseInstall: returns nothing for a bare deputy.com host", () => {
  assertEquals(parseInstall("https://deputy.com"), {});
});

Deno.test("host / sameHost: compares hostnames, case-insensitively", () => {
  assertEquals(host("https://Simonssambos.AU.deputy.com/x"), "simonssambos.au.deputy.com");
  assertEquals(
    sameHost("https://simonssambos.au.deputy.com/a", "https://simonssambos.au.deputy.com/b"),
    true,
  );
  assertEquals(
    sameHost("https://simonssambos.au.deputy.com", "https://once.deputy.com/my/"),
    false,
  );
});

Deno.test("compact: drops undefined, null and empty-string values", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
});

Deno.test("compact: drops empty arrays but keeps non-empty ones", () => {
  assertEquals(compact({ a: [], b: [1] }), { b: [1] });
});

Deno.test("csv: splits a comma-separated string and trims entries", () => {
  assertEquals(csv(" EmployeeObject ,  CompanyObject "), ["EmployeeObject", "CompanyObject"]);
});

Deno.test("csv: passes an array through, trimmed", () => {
  assertEquals(csv(["A", " B "]), ["A", "B"]);
});

Deno.test("csv: returns undefined for empty input", () => {
  assertEquals(csv(""), undefined);
  assertEquals(csv(undefined), undefined);
  assertEquals(csv([]), undefined);
});

Deno.test("asOptionalJson: parses a JSON string", () => {
  assertEquals(asOptionalJson<{ a: number }>('{"a":1}', "Filter"), { a: 1 });
});

Deno.test("asOptionalJson: passes an already-parsed value through", () => {
  assertEquals(asOptionalJson<{ a: number }>({ a: 1 }, "Filter"), { a: 1 });
});

Deno.test("asOptionalJson: returns undefined for empty input", () => {
  assertEquals(asOptionalJson(undefined, "Filter"), undefined);
  assertEquals(asOptionalJson("", "Filter"), undefined);
});

Deno.test("asOptionalJson: throws a labelled error for invalid JSON", () => {
  assertThrows(() => asOptionalJson("{not json", "Filter"), Error, "Filter is not valid JSON");
});

Deno.test("errorMessage: reads Deputy's {error:{code,message}} envelope", () => {
  assertEquals(
    errorMessage('{"error":{"code":403,"message":"No authorization given"}}'),
    "No authorization given (403)",
  );
});

Deno.test('errorMessage: reads Deputy\'s flat {error:"..."} envelope', () => {
  assertEquals(errorMessage('{"error":"invalid_request"}'), "invalid_request");
});

Deno.test("errorMessage: falls back to the raw body when it is not JSON", () => {
  assertEquals(errorMessage("plain text failure"), "plain text failure");
});

Deno.test("errorMessage: returns empty string for empty input", () => {
  assertEquals(errorMessage(""), "");
});

Deno.test("errorMessage: truncates a very long non-JSON body", () => {
  const long = "x".repeat(400);
  const out = errorMessage(long);
  assertEquals(out.endsWith("…"), true);
  assertEquals(out.length, 301);
});

Deno.test("resourcePath: builds the bare resource path", () => {
  assertEquals(resourcePath("Employee"), "/resource/Employee");
});

Deno.test("resourcePath: appends an id, URL-encoded", () => {
  assertEquals(resourcePath("Employee", 5), "/resource/Employee/5");
  assertEquals(resourcePath("Employee", "a b"), "/resource/Employee/a%20b");
});

Deno.test("MAX_PAGE_SIZE: is Deputy's documented 500-record cap", () => {
  assertEquals(MAX_PAGE_SIZE, 500);
});

Deno.test("baseUrlFromConnection: reads and normalizes the connection's baseUrl", () => {
  const { ctx } = mockCtx([], { display: { baseUrl: `${BASE_URL}/` } });
  assertEquals(baseUrlFromConnection(ctx.connection), BASE_URL);
});

Deno.test("baseUrlFromConnection: throws when the connection has no baseUrl", () => {
  const { ctx } = mockCtx([], { display: {} });
  assertThrows(() => baseUrlFromConnection(ctx.connection), Error, "no install URL");
});

Deno.test("DeputyClient.list: GETs /api/v1/resource/{Object}", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: [{ Id: 1 }, { Id: 2 }] }],
    { display: { baseUrl: BASE_URL } },
  );
  const items = await new DeputyClient(ctx).list("Employee");
  assertEquals(items, [{ Id: 1 }, { Id: 2 }]);
  assertEquals(calls[0].url, `${BASE_URL}/api/v1/resource/Employee`);
  assertEquals(calls[0].method, "GET");
});

Deno.test("DeputyClient.get: GETs /api/v1/resource/{Object}/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Id: 5 } }], {
    display: { baseUrl: BASE_URL },
  });
  const item = await new DeputyClient(ctx).get("Employee", 5);
  assertEquals(item, { Id: 5 });
  assertEquals(calls[0].url, `${BASE_URL}/api/v1/resource/Employee/5`);
});

Deno.test("DeputyClient.query: POSTs the body to /QUERY", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ Id: 1 }] }], {
    display: { baseUrl: BASE_URL },
  });
  await new DeputyClient(ctx).query("Employee", {
    search: { s1: { field: "Id", data: 1, type: "eq" } },
  });
  assertEquals(calls[0].url, `${BASE_URL}/api/v1/resource/Employee/QUERY`);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    search: { s1: { field: "Id", data: 1, type: "eq" } },
  });
});

Deno.test("DeputyClient.create: POSTs to /api/v1/resource/{Object}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Id: 9 } }], {
    display: { baseUrl: BASE_URL },
  });
  await new DeputyClient(ctx).create("Employee", { FirstName: "Ada" });
  assertEquals(calls[0].url, `${BASE_URL}/api/v1/resource/Employee`);
  assertEquals(calls[0].method, "POST");
});

Deno.test("DeputyClient.update: POSTs to /api/v1/resource/{Object}/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Id: 9 } }], {
    display: { baseUrl: BASE_URL },
  });
  await new DeputyClient(ctx).update("Employee", 9, { FirstName: "Ada" });
  assertEquals(calls[0].url, `${BASE_URL}/api/v1/resource/Employee/9`);
  assertEquals(calls[0].method, "POST");
});

Deno.test("DeputyClient.supervise: POSTs to /api/v1/supervise/{path}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Id: 1 } }], {
    display: { baseUrl: BASE_URL },
  });
  await new DeputyClient(ctx).supervise("timesheet/start", { intEmployeeId: 1, intOpunitId: 2 });
  assertEquals(calls[0].url, `${BASE_URL}/api/v1/supervise/timesheet/start`);
  assertEquals(calls[0].method, "POST");
});

Deno.test("DeputyClient.request: never sets Authorization itself — that is sign()'s job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], { display: { baseUrl: BASE_URL } });
  await new DeputyClient(ctx).list("Employee");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("DeputyClient.request: throws with Deputy's own error message on a non-ok response", async () => {
  const { ctx } = mockCtx(
    [{ status: 403, body: { error: { code: 403, message: "No authorization given" } } }],
    { display: { baseUrl: BASE_URL } },
  );
  await assertRejects(
    () => new DeputyClient(ctx).list("Employee"),
    Error,
    "No authorization given (403)",
  );
});

Deno.test("DeputyClient.request: throws a clear error when a 200 is not JSON", async () => {
  const { ctx } = mockCtx(
    [{ status: 200, body: "<html>login</html>", headers: { "content-type": "text/html" } }],
    { display: { baseUrl: BASE_URL } },
  );
  await assertRejects(
    () => new DeputyClient(ctx).list("Employee"),
    Error,
    "but not JSON",
  );
});
