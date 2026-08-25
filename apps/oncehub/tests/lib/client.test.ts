import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { OnceHubClient } from "../../lib/client.ts";

Deno.test("client: GET builds the /v2-prefixed URL and sends no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "list", data: [] } }]);
  await new OnceHubClient(ctx).request("/bookings");
  assertEquals(calls[0].url, "https://api.oncehub.com/v2/bookings");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
});

Deno.test("client: query params are set, undefined/null/empty are skipped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new OnceHubClient(ctx).request("/bookings", {
    query: { status: "scheduled", owner: undefined, contact: null, limit: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("status"), "scheduled");
  assertEquals(url.searchParams.has("owner"), false);
  assertEquals(url.searchParams.has("contact"), false);
  assertEquals(url.searchParams.has("limit"), false);
});

Deno.test("client: POST sends JSON body with content-type header", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "WHK-1" } }]);
  await new OnceHubClient(ctx).request("/webhooks", {
    method: "POST",
    body: { name: "x", url: "https://example.com" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ name: "x", url: "https://example.com" }));
});

Deno.test("client: a 204 response resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  const result = await new OnceHubClient(ctx).request("/webhooks/WHK-1", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("client: a non-ok response throws with the vendor's type/message/param", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { type: "invalid_request_error", message: "No such booking: '123'", param: "id" },
  }]);
  await assertRejects(
    () => new OnceHubClient(ctx).request("/bookings/123"),
    Error,
    "invalid_request_error",
  );
});
