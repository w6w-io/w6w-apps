import { assertEquals } from "@std/assert";
import { mockDripCtx } from "../_helpers.ts";
import action from "../../actions/unsubscribe-subscriber.ts";

Deno.test("unsubscribe-subscriber: POSTs /subscribers/:idOrEmail/unsubscribe_all", async () => {
  const { ctx, calls } = mockDripCtx([{
    body: { subscribers: [{ id: "abc", status: "unsubscribed" }] },
  }]);
  const out = await action.execute({ idOrEmail: "john@acme.com" }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.getdrip.com/v2/1234567/subscribers/john%40acme.com/unsubscribe_all",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(out, { id: "abc", status: "unsubscribed" });
});
