import { assertEquals } from "@std/assert";
import { mockWorkableCtx } from "../_helpers.ts";
import action from "../../actions/webhook-unsubscribe.ts";

Deno.test("webhook-unsubscribe: DELETEs /subscriptions/:id and returns the status", async () => {
  const { ctx, calls } = mockWorkableCtx([{ status: 200, body: {} }]);
  const out = await action.execute({ id: "42" }, ctx);
  assertEquals(calls[0].url, "https://acme.workable.com/spi/v3/subscriptions/42");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { status: 200 });
});
