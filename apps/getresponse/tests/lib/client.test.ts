import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  asOptionalJson,
  AUTH_PREFIX,
  baseUrlFor,
  buildQuery,
  compact,
  formatGetResponseError,
  GetResponseClient,
  PLATFORM_HOSTS,
  platformFromConnection,
  toList,
  truncate,
} from "../../lib/client.ts";
import { errorBody, MAX_US_BASE, mockGetResponseCtx, RETAIL_BASE } from "../_helpers.ts";

/** The three platforms are separate products on separate hosts. */
Deno.test("PLATFORM_HOSTS: the three hosts the vendor's spec declares", () => {
  assertEquals(PLATFORM_HOSTS, {
    "retail": "api.getresponse.com",
    "max-us": "api3.getresponse360.com",
    "max-pl": "api3.getresponse360.pl",
  });
  assertEquals(baseUrlFor("retail"), RETAIL_BASE);
  assertEquals(baseUrlFor("max-us"), MAX_US_BASE);
  assertEquals(baseUrlFor(undefined), RETAIL_BASE, "retail is the default");
});

Deno.test("AUTH_PREFIX: the literal prefix the security scheme requires", () => {
  assertEquals(AUTH_PREFIX, "api-key ");
});

Deno.test("platformFromConnection: reads display, ignoring anything unrecognised", () => {
  const { ctx } = mockGetResponseCtx([], "max-us");
  assertEquals(platformFromConnection(ctx.connection), "max-us");
  assertEquals(platformFromConnection(undefined), "retail");
  assertEquals(
    platformFromConnection({ display: { platform: "max-de" } } as never),
    "retail",
    "an unknown platform falls back rather than building a bogus host",
  );
});

Deno.test("compact: drops unset keys but keeps false and 0", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }),
    { a: 1, e: false, f: 0 },
  );
});

Deno.test("toList: accepts an array, a bare string, or a comma-separated string", () => {
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList("a, b ,c"), ["a", "b", "c"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(","), undefined);
});

Deno.test("asOptionalJson: passes objects through, parses strings, names bad JSON", () => {
  assertEquals(asOptionalJson({ a: 1 }, "X"), { a: 1 });
  assertEquals(asOptionalJson('[{"a":1}]', "X"), [{ a: 1 }]);
  assertEquals(asOptionalJson("", "X"), undefined);
  assertThrows(() => asOptionalJson("{nope", "Custom field values"), Error, "not valid JSON");
});

/**
 * The bracketed names are the vendor's, not a convention this client invents:
 * `query[createdOn][from]`, `sort[email]`. Getting them wrong silently returns
 * an unfiltered list.
 */
Deno.test("buildQuery: flattens structured filters into bracketed parameter names", () => {
  assertEquals(
    buildQuery({
      query: { email: "ada@example.com", createdOn: { from: "2026-01-01", to: "2026-02-01" } },
      sort: { createdOn: "DESC" },
      page: 2,
    }),
    {
      "query[email]": "ada@example.com",
      "query[createdOn][from]": "2026-01-01",
      "query[createdOn][to]": "2026-02-01",
      "sort[createdOn]": "DESC",
      "page": 2,
    },
  );
});

/**
 * An empty filter value is worse than no filter: GetResponse treats
 * `query[email]=` as matching nothing, which is indistinguishable from a genuine
 * empty result.
 */
Deno.test("buildQuery: skips unset values rather than sending empty filters", () => {
  assertEquals(
    buildQuery({ query: { email: undefined, name: "", campaignId: null }, page: 1 }),
    { page: 1 },
  );
  assertEquals(buildQuery({ query: { createdOn: { from: undefined } } }), {});
});

Deno.test("buildQuery: joins array values with commas", () => {
  assertEquals(buildQuery({ fields: ["contactId", "email"] }), { fields: "contactId,email" });
});

Deno.test("truncate: leaves short text alone and reports what it cut", () => {
  assertEquals(truncate("short", 10), "short");
  assert(truncate("x".repeat(50), 10).includes("50 bytes truncated"));
});

/**
 * The numeric `code` is the stable, documented half — 1014 authentication,
 * 1015 throttling — and is what distinguishes the two problems.
 */
Deno.test("formatGetResponseError: surfaces the numeric code and the message", () => {
  const msg = formatGetResponseError(
    401,
    "GET",
    "/v3/accounts",
    JSON.stringify(errorBody(1014, "Unsupported authentication method")),
  );
  assert(msg.includes("401"), msg);
  assert(msg.includes("code 1014"), msg);
  assert(msg.includes("Unsupported authentication method"), msg);
});

Deno.test("formatGetResponseError: includes the validation context when present", () => {
  const msg = formatGetResponseError(
    400,
    "POST",
    "/v3/contacts",
    JSON.stringify({ code: 1000, message: "Validation failed", context: [{ fieldName: "email" }] }),
  );
  assert(msg.includes("Validation failed"), msg);
  assert(msg.includes("email"), msg);
});

Deno.test("formatGetResponseError: falls back to the raw body when it is not JSON", () => {
  const msg = formatGetResponseError(502, "GET", "/v3/contacts", "<html>bad gateway</html>");
  assert(msg.includes("502"), msg);
  assert(msg.includes("bad gateway"), msg);
});

Deno.test("client: builds against the connection's platform host", async () => {
  const retail = mockGetResponseCtx([{ body: [] }], "retail");
  await new GetResponseClient(retail.ctx).request("/contacts");
  assertEquals(retail.calls[0].url, `${RETAIL_BASE}/contacts`);

  const max = mockGetResponseCtx([{ body: [] }], "max-us");
  await new GetResponseClient(max.ctx).request("/contacts");
  assertEquals(max.calls[0].url, `${MAX_US_BASE}/contacts`);
});

Deno.test("client: drops empty query values instead of sending blanks", async () => {
  const { ctx, calls } = mockGetResponseCtx([{ body: [] }]);
  await new GetResponseClient(ctx).request("/contacts", {
    query: { a: undefined, b: null, c: "", d: 0, e: false },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), null);
  assertEquals(url.searchParams.get("c"), null);
  assertEquals(url.searchParams.get("d"), "0");
  assertEquals(url.searchParams.get("e"), "false");
});

Deno.test("client: a 204 resolves to undefined rather than throwing on an empty body", async () => {
  const { ctx } = mockGetResponseCtx([{ status: 204 }]);
  assertEquals(
    await new GetResponseClient(ctx).request("/contacts/c1", { method: "DELETE" }),
    undefined,
  );
});

Deno.test("client: a JSON body is sent with a content-type, a GET is not", async () => {
  const { ctx, calls } = mockGetResponseCtx([{ body: {} }, { body: [] }]);
  const client = new GetResponseClient(ctx);
  await client.request("/contacts", { method: "POST", body: { email: "a@b.com" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"email":"a@b.com"}');
  await client.request("/contacts");
  assertEquals(calls[1].headers["content-type"], undefined);
});

Deno.test("client: a non-2xx throws with GetResponse's own code", async () => {
  const { ctx } = mockGetResponseCtx([
    { status: 429, body: errorBody(1015, "You have reached your requests limit") },
  ]);
  await assertRejects(
    async () => {
      await new GetResponseClient(ctx).request("/contacts");
    },
    Error,
    "code 1015",
  );
});

/** The action worker must never see or build the auth header. */
Deno.test("client: never sets X-Auth-Token — that is sign's job", async () => {
  const { ctx, calls } = mockGetResponseCtx([{ body: [] }]);
  await new GetResponseClient(ctx).request("/contacts");
  assertEquals(calls[0].headers["x-auth-token"], undefined);
});
