import { assertEquals } from "@std/assert";
import subscriptionList from "../../actions/subscription-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("subscription-list: hits GET /subscriptions with the status filter", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope("subscriptions", [{ id: 1 }]) }]);
  const out = await subscriptionList.execute({ status: "active" }, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/subscriptions");
  assertEquals(queryOf(calls[0].url), { status: "active" });
  assertEquals(out.items, [{ id: 1 }]);
});

Deno.test("subscription-list: cursor is forwarded verbatim for paging", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope("subscriptions", []) }]);
  await subscriptionList.execute({ cursor: "abc123" }, ctx);
  assertEquals(queryOf(calls[0].url), { cursor: "abc123" });
});
