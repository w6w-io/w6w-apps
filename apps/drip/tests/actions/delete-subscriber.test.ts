import { assertEquals } from "@std/assert";
import { mockDripCtx } from "../_helpers.ts";
import action from "../../actions/delete-subscriber.ts";

Deno.test("delete-subscriber: DELETEs /subscribers/:idOrEmail", async () => {
  const { ctx, calls } = mockDripCtx([{ status: 204 }]);
  const out = await action.execute({ idOrEmail: "john@acme.com" }, ctx);
  assertEquals(calls[0].url, "https://api.getdrip.com/v2/1234567/subscribers/john%40acme.com");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { success: true });
});

Deno.test("delete-subscriber: is declared idempotent", () => {
  assertEquals(action.idempotent, true);
});
