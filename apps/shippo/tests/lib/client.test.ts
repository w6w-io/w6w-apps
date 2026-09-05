import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  addressRef,
  compact,
  csv,
  describeError,
  dimension,
  json,
  ShippoClient,
  sortRates,
} from "../../lib/client.ts";

Deno.test("compact: drops unset keys so an omitted field stays omitted", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: [], f: false }), {
    a: 1,
    f: false,
  });
});

Deno.test("csv: splits, trims and drops empties; blank means unset", () => {
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
});

Deno.test("json: parses text, passes live values, and names the bad field", () => {
  assertEquals(json('{"a":1}', "customsDeclaration"), { a: 1 });
  try {
    json("{oops", "customsDeclaration");
    throw new Error("expected a throw");
  } catch (err) {
    assert(String(err).includes("`customsDeclaration`"), String(err));
  }
});

/** Shippo accepts an address inline or by id, and a warehouse should reuse one. */
Deno.test("addressRef: a plain string becomes an id, not JSON-parsed", () => {
  assertEquals(addressRef("adr_123", "addressFrom"), "adr_123");
  assertEquals(addressRef('{"street1":"1 Main St"}', "addressTo"), { street1: "1 Main St" });
  assertEquals(addressRef({ street1: "1 Main St" }, "addressTo"), { street1: "1 Main St" });
  assertEquals(addressRef("", "addressTo"), undefined);
});

/** Shippo's schema types dimensions/weight as strings, not numbers. */
Deno.test("dimension: stringifies a numeric value and leaves blanks unset", () => {
  assertEquals(dimension(10), "10");
  assertEquals(dimension("10"), "10");
  assertEquals(dimension(""), undefined);
  assertEquals(dimension(undefined), undefined);
});

/**
 * `amount` is a string. Comparing rates as strings puts "9.99" above "10.05",
 * which buys the wrong label and is never noticed.
 */
Deno.test("sortRates: orders numerically, not lexically", () => {
  const sorted = sortRates([
    { object_id: "r1", amount: "10.05" },
    { object_id: "r2", amount: "9.99" },
    { object_id: "r3", amount: "100.00" },
  ]);
  assertEquals(sorted.map((r) => r.object_id), ["r2", "r1", "r3"]);
});

Deno.test("sortRates: does not mutate its input", () => {
  const rates = [{ object_id: "r1", amount: "10" }, { object_id: "r2", amount: "5" }];
  sortRates(rates);
  assertEquals(rates.map((r) => r.object_id), ["r1", "r2"]);
});

Deno.test("client: builds the bare-root URL and sets no authorization", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [] } }]);
  await new ShippoClient(ctx).request("/shipments");
  assertEquals(calls[0].url, "https://api.goshippo.com/shipments");
  assertEquals(calls[0].headers["authorization"], undefined);
});

/** Unlike some shipping APIs, Shippo's body is the object itself — no wrapper key. */
Deno.test("client: a body is sent bare, with no wrapper key", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { object_id: "shp_1" } }]);
  await new ShippoClient(ctx).request("/shipments", {
    method: "POST",
    body: { metadata: "order-1" },
  });
  assertEquals(JSON.parse(calls[0].body!), { metadata: "order-1" });
});

Deno.test("client: query params are set on the URL", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new ShippoClient(ctx).request("/shipments", { query: { page: 2, results: 10 } });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("results"), "10");
});

Deno.test("client: a 204/empty response resolves to undefined rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  const result = await new ShippoClient(ctx).request("/refunds/r1");
  assertEquals(result, undefined);
});

/** The three auth failure shapes Shippo actually returns, reproduced live 2026-09-05. */
Deno.test("describeError: 'Token does not exist' points at the rejected token", () => {
  const out = describeError(401, JSON.stringify({ detail: "Token does not exist" }));
  assert(/rejected/.test(out), out);
  assert(/Token does not exist/.test(out), out);
});

Deno.test("describeError: 'Invalid access token.' points at the wrong auth scheme", () => {
  const out = describeError(403, JSON.stringify({ detail: "Invalid access token." }));
  assert(/ShippoToken scheme/.test(out), out);
});

Deno.test("describeError: a missing token is distinguished from a bad one", () => {
  const out = describeError(
    401,
    JSON.stringify({ detail: "Authentication credentials were not provided." }),
  );
  assert(/no API token was sent/.test(out), out);
});

/** Shippo's BadRequest schema is an arbitrary `{field: [...]}` object. */
Deno.test("describeError: surfaces field-level validation errors", () => {
  const out = describeError(400, JSON.stringify({ zip: ["This field is required."] }));
  assert(out.includes("zip: This field is required."), out);
});

Deno.test("describeError: a 429 names the per-minute rate-limits doc", () => {
  const out = describeError(429, "{}");
  assert(/PER MINUTE/.test(out), out);
  assert(out.includes("docs.goshippo.com/api-concepts/rate-limits"), out);
});

Deno.test("client: an error carries the method, the path and Shippo's message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { detail: "Token does not exist" } }]);
  await assertRejects(
    async () => await new ShippoClient(ctx).request("/shipments/nope"),
    Error,
    "Shippo 401 for GET /shipments/nope:",
  );
});
