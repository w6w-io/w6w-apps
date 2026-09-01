import { assert, assertEquals, assertRejects } from "@std/assert";
import { API_BASE, MessageBirdClient } from "../../lib/client.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client: the base is MessageBird's classic REST host", () => {
  assertEquals(API_BASE, "https://rest.messagebird.com");
});

Deno.test("client: a GET request carries no body and an Accept header", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  const result = await new MessageBirdClient(ctx).request("/messages/1");

  assertEquals(result, { id: "1" });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.accept, "application/json");
});

Deno.test("client: a POST body is JSON-encoded with the JSON content type", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await new MessageBirdClient(ctx).request("/messages", {
    method: "POST",
    body: { originator: "Test", body: "hi", recipients: ["31612345678"] },
  });

  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(
    calls[0].body,
    JSON.stringify({ originator: "Test", body: "hi", recipients: ["31612345678"] }),
  );
});

Deno.test("client: undefined fields are dropped from the JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new MessageBirdClient(ctx).request("/messages", {
    method: "POST",
    body: { originator: "Test", reference: undefined },
  });
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { originator: "Test" });
});

Deno.test("client: query values that are empty, null or undefined are dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await new MessageBirdClient(ctx).request("/messages", {
    query: { a: "x", b: undefined, c: null, d: "", e: 0 },
  });
  assertEquals(queryOf(calls[0].url), { a: "x", e: "0" });
});

Deno.test("client: the path is built under the classic REST host", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new MessageBirdClient(ctx).request("/balance");
  assertEquals(pathOf(calls[0].url), "/balance");
  assert(calls[0].url.startsWith(API_BASE));
});

Deno.test("client: a 204 with no body resolves to undefined rather than throwing on parse", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  assertEquals(await new MessageBirdClient(ctx).request("/messages/1"), undefined);
});

Deno.test("client: a non-2xx response throws with the vendor's own error description", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody([{ code: 2, description: "Request not allowed" }]) },
  ]);
  const err = await assertRejects(
    () => new MessageBirdClient(ctx).request("/messages"),
    Error,
  );
  assert(err.message.includes("401"), err.message);
  assert(err.message.includes("Request not allowed"), err.message);
  assert(err.message.includes("/messages"), err.message);
});

Deno.test("client: a non-2xx response with an unreadable body still throws with the status", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const err = await assertRejects(() => new MessageBirdClient(ctx).request("/messages"), Error);
  assert(err.message.includes("500"), err.message);
});
