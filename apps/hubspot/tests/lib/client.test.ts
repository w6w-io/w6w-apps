import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { HubSpotClient, toProperties } from "../../lib/client.ts";
import { coerceProperties, normalizeCsv } from "../../lib/crm.ts";

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new HubSpotClient(ctx);
  const result = await client.request("/crm/v3/objects/contacts/1", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"status":"error"}' },
  ]);
  const client = new HubSpotClient(ctx);
  const err = await assertRejects(
    () => client.request("/crm/v3/objects/contacts/missing"),
    Error,
    "HubSpot 404",
  );
  assertEquals(err.message.includes("/crm/v3/objects/contacts/missing"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new HubSpotClient(ctx);
  await client.request("/x", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: repeats array query params (HubSpot idiom)", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new HubSpotClient(ctx);
  await client.request("/crm/v3/objects/contacts", {
    query: { properties: ["email", "firstname", "lastname"] },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("properties"), ["email", "firstname", "lastname"]);
});

Deno.test("client: passes an absolute URL through unchanged", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new HubSpotClient(ctx);
  await client.request("https://api.hsforms.com/submissions/v3/integration/submit/1/2", {
    method: "POST",
    body: {},
  });
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.hsforms.com");
});

Deno.test("toProperties: drops empty/nullish values", () => {
  const out = toProperties({ a: "x", b: null, c: undefined, d: "", e: 5 });
  assertEquals(out, { a: "x", e: "5" });
});

Deno.test("coerceProperties: stringifies numbers/booleans/dates", () => {
  const now = new Date(1_700_000_000_000);
  const out = coerceProperties({ n: 42, b: true, when: now, name: "hi", nope: null });
  assertEquals(out.n, "42");
  assertEquals(out.b, "true");
  assertEquals(out.when, "1700000000000");
  assertEquals(out.name, "hi");
  assertEquals("nope" in out, false);
});

Deno.test("normalizeCsv: returns array from CSV string, passes arrays through", () => {
  assertEquals(normalizeCsv("a,b,c"), ["a", "b", "c"]);
  assertEquals(normalizeCsv(["a", "b"]), ["a", "b"]);
  assertEquals(normalizeCsv(""), undefined);
  assertEquals(normalizeCsv(undefined), undefined);
});
