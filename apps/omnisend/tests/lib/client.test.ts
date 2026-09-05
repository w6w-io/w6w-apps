import { assert, assertEquals, assertRejects } from "@std/assert";
import { API_URL, API_VERSION, OmnisendClient } from "../../lib/client.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("client: the base URL and pinned version match Omnisend's documented server", () => {
  assertEquals(API_URL, "https://api.omnisend.com/api");
  assertEquals(API_VERSION, "2026-03-15");
});

Deno.test("client: every request carries the version header and accept, never authorization", async () => {
  const { ctx, calls } = mockCtx([{ body: { brandID: "b1" } }]);
  await new OmnisendClient(ctx).request("/brands/current");

  assertEquals(calls[0].headers["omnisend-version"], API_VERSION);
  assertEquals(calls[0].headers.accept, "application/json");
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("client: a body sets content-type and is JSON-encoded", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "c1" } }]);
  await new OmnisendClient(ctx).request("/contacts", {
    method: "POST",
    body: { identifiers: [{ type: "email", id: "a@b.com" }] },
  });

  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"identifiers":[{"type":"email","id":"a@b.com"}]}');
});

Deno.test("client: no body means no content-type header", async () => {
  const { ctx, calls } = mockCtx([{ body: { brandID: "b1" } }]);
  await new OmnisendClient(ctx).request("/brands/current");
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("client: the path is built under the /api prefix", async () => {
  const { ctx, calls } = mockCtx([{ body: { brandID: "b1" } }]);
  await new OmnisendClient(ctx).request("/brands/current");
  assertEquals(pathOf(calls[0].url), "/api/brands/current");
});

Deno.test("client: a path without a leading slash is still rooted under the prefix", async () => {
  const { ctx, calls } = mockCtx([{ body: { brandID: "b1" } }]);
  await new OmnisendClient(ctx).request("brands/current");
  assertEquals(pathOf(calls[0].url), "/api/brands/current");
});

Deno.test("client: query values that are empty, null or undefined are dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [] } }]);
  await new OmnisendClient(ctx).request("/contacts", {
    query: { a: "x", b: undefined, c: null, d: "", e: 0, f: false },
  });
  assertEquals(queryOf(calls[0].url), { a: "x", e: "0", f: "false" });
});

Deno.test("client: a 202 Accepted (async tag jobs) yields undefined rather than a parse error", async () => {
  const { ctx } = mockCtx([{ status: 202, body: undefined }]);
  assertEquals(
    await new OmnisendClient(ctx).request("/contacts/tags", { method: "POST" }),
    undefined,
  );
});

Deno.test("client: a 204 No Content yields undefined", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  assertEquals(await new OmnisendClient(ctx).request("/whatever"), undefined);
});

Deno.test("client: an empty-string body yields undefined instead of a JSON parse error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await new OmnisendClient(ctx).request("/whatever"), undefined);
});

Deno.test("client: a non-2xx response throws with the vendor's problem detail", async () => {
  const { ctx } = mockCtx([
    {
      status: 400,
      body: problemBody("validation-failed", "Validation failed", 400, {
        detail: "identifiers[0].id must be a valid email address",
      }),
    },
  ]);
  const err = await assertRejects(() => new OmnisendClient(ctx).request("/contacts"), Error);

  assert(err.message.includes("400"), err.message);
  assert(err.message.includes("/api/contacts"), err.message);
  assert(err.message.includes("identifiers[0].id must be a valid email address"), err.message);
});

Deno.test("client: a problem with no detail falls back to the title", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: problemBody("unauthorized", "Unauthorized", 401),
  }]);
  const err = await assertRejects(() => new OmnisendClient(ctx).request("/brands/current"), Error);
  assert(err.message.includes("Unauthorized"), err.message);
});

Deno.test("client: a non-JSON error body falls back to the raw text", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  const err = await assertRejects(() => new OmnisendClient(ctx).request("/contacts"), Error);
  assert(err.message.includes("<html>bad gateway</html>"), err.message);
});
