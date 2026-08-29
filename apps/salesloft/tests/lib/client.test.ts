import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { compact, SalesloftClient } from "../../lib/client.ts";

Deno.test("client: prefixes the v2 base and returns the parsed envelope", async () => {
  const body = { data: { id: 7, name: "Acme" } };
  const { ctx, calls } = mockCtx([{ body }]);
  const client = new SalesloftClient(ctx);
  const result = await client.request("/accounts/7");

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.salesloft.com");
  assertEquals(url.pathname, "/v2/accounts/7");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  const client = new SalesloftClient(ctx);
  await client.request("/people", {
    query: { a: "kept", b: undefined, c: null, d: "", n: 0 },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.get("n"), "0");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: { error: "Record not found" } },
  ]);
  const client = new SalesloftClient(ctx);
  const err = await assertRejects(
    () => client.request("/people/999"),
    Error,
    "Salesloft 404",
  );
  assertEquals(err.message.includes("/v2/people/999"), true);
  assertEquals(err.message.includes("Record not found"), true);
});

Deno.test("client: JSON-encodes the body and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  const client = new SalesloftClient(ctx);
  await client.request("/people", { method: "POST", body: { first_name: "Ada" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { first_name: "Ada" });
});

Deno.test("client: a 204 with no body returns an undefined data field", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const client = new SalesloftClient(ctx);
  const result = await client.request("/people/1", { method: "DELETE" });
  assertEquals(result, { data: undefined });
});

Deno.test("compact: drops undefined/null/empty but keeps 0 and false", () => {
  assertEquals(
    compact({ a: 1, b: 0, c: false, d: undefined, e: null, f: "", g: "x" }),
    { a: 1, b: 0, c: false, g: "x" },
  );
});
