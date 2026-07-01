import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { FacebookClient } from "../../lib/client.ts";

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 400, statusText: "Bad Request", body: '{"error":{"message":"boom"}}' },
  ]);
  const client = new FacebookClient(ctx);
  const err = await assertRejects(
    () => client.request("/12345/leads"),
    Error,
    "Facebook 400",
  );
  assertEquals(err.message.includes("/v19.0/12345/leads"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new FacebookClient(ctx);
  await client.request("/x", { query: { a: "kept", b: undefined, c: null, d: "" } });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: bearerOverride sets the Authorization header", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new FacebookClient(ctx);
  await client.request("/x", { bearerOverride: "override-token" });
  assertEquals(calls[0].headers["authorization"], "Bearer override-token");
});
