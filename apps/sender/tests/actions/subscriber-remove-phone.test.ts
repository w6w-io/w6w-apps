import { assertEquals } from "@std/assert";
import subscriberRemovePhone from "../../actions/subscriber-remove-phone.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscriber-remove-phone: DELETEs /v2/subscribers/{id}/remove_phone", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, message: "Subscriber phone removed" },
  }]);
  await subscriberRemovePhone.execute({ id: "o1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/subscribers/o1/remove_phone");
});
