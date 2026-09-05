import { assertEquals } from "@std/assert";
import inboxGet from "../../actions/inbox-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("inbox-get: fetches GET /inboxes/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { _id: "in_1", name: "Invoices" } }]);
  const result = await inboxGet.execute({ inboxId: "in_1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/inboxes/in_1");
  assertEquals(result, { _id: "in_1", name: "Invoices" });
});

Deno.test("inbox-get: URL-encodes the inbox id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await inboxGet.execute({ inboxId: "weird id/1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/inboxes/weird%20id%2F1");
});

Deno.test("inbox-get: read type", () => {
  assertEquals(inboxGet.type, "read");
});
