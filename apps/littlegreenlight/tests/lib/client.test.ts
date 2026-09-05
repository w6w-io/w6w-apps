import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  API_BASE,
  API_PREFIX,
  compact,
  formatLglError,
  LglClient,
  qFilters,
} from "../../lib/client.ts";
import { envelope, invalidTokenBody, mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("client: the base and prefix are LGL's single declared server", () => {
  assertEquals(API_BASE, "https://api.littlegreenlight.com");
  assertEquals(API_PREFIX, "/api/v1");
});

Deno.test("client: list() returns the full envelope, not just items", async () => {
  const { ctx } = mockCtx([{ body: envelope([{ id: 1 }], { total_items: 42 }) }]);
  const out = await new LglClient(ctx).list("/campaigns");
  assertEquals(out.items, [{ id: 1 }]);
  assertEquals(out.total_items, 42);
});

Deno.test("client: list() on an empty body yields an empty items array", async () => {
  const { ctx } = mockCtx([{ body: undefined }]);
  const out = await new LglClient(ctx).list("/campaigns");
  assertEquals(out.items, []);
});

Deno.test("client: get() returns the parsed body", async () => {
  const { ctx } = mockCtx([{ body: { id: 7, first_name: "Ada" } }]);
  const out = await new LglClient(ctx).get("/constituents/7");
  assertEquals(out, { id: 7, first_name: "Ada" });
});

Deno.test("client: create() POSTs a JSON body and returns the parsed response", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 9 } }]);
  const out = await new LglClient(ctx).create("/constituents", { first_name: "Ada" });
  assertEquals(out, { id: 9 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ first_name: "Ada" }));
});

Deno.test("client: every request hits the declared host, the /api/v1 prefix, and a .json suffix", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await new LglClient(ctx).list("/campaigns");
  assertEquals(pathOf(calls[0].url), "/api/v1/campaigns.json");
  assert(calls[0].url.startsWith(`${API_BASE}${API_PREFIX}`));
});

Deno.test("client: query values that are empty, null or undefined are dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await new LglClient(ctx).list("/campaigns", { query: { limit: 5, offset: undefined, name: "" } });
  assertEquals(queryOf(calls[0].url), { limit: "5" });
});

Deno.test("client: qFilters() builds field=value clauses and drops unset values", () => {
  assertEquals(qFilters({ name: "brady", city: undefined, state: "" }), ["name=brady"]);
});

Deno.test("client: filters are sent as repeated q[] entries, not a single joined string", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await new LglClient(ctx).list("/constituents/search", { filters: qFilters({ name: "brady" }) });
  assertEquals(queryAllOf(calls[0].url, "q[]"), ["name=brady"]);
});

Deno.test("client: a non-ok response throws with the LGL error message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: invalidTokenBody("expired") }]);
  await assertRejects(
    () => new LglClient(ctx).list("/campaigns"),
    Error,
    "invalid_token: expired",
  );
});

Deno.test("client: formatLglError falls back to the raw body when it is not the documented shape", () => {
  const msg = formatLglError(500, "GET", "/api/v1/campaigns", "<html>oops</html>");
  assert(msg.includes("<html>oops</html>"));
});

Deno.test("client: formatLglError reads error/error_description", () => {
  const msg = formatLglError(
    401,
    "GET",
    "/api/v1/constituents.json",
    JSON.stringify(invalidTokenBody("revoked")),
  );
  assertEquals(msg, "LGL 401 for GET /api/v1/constituents.json: invalid_token: revoked");
});

Deno.test("client: compact() drops unset keys and keeps set ones, including falsy-but-set values", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: 0, f: false }), {
    a: 1,
    e: 0,
    f: false,
  });
});
