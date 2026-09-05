import { assertEquals } from "@std/assert";
import broadcastCreate from "../../actions/broadcast-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * The whole point of this test: unlike subscriber-add/custom-field-create
 * (201, no body, Location header), creating a broadcast answers a plain 200
 * with the full created entity in the body.
 */
Deno.test("broadcast-create: answers 200 with the full created broadcast, not a Location header", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { broadcast_id: "1", subject: "Hello", status: "draft" } },
  ]);
  const out = await broadcastCreate.execute(
    { accountId: "1", listId: "2", subject: "Hello", bodyText: "Hi there" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2/broadcasts");
  assertEquals(calls[0].method, "POST");
  assertEquals(out.broadcast_id, "1");
  assertEquals(out.status, "draft");
});

Deno.test("broadcast-create: sends only the fields provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { broadcast_id: "1" } }]);
  await broadcastCreate.execute({ accountId: "1", listId: "2", subject: "Hello" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { subject: "Hello" });
});
