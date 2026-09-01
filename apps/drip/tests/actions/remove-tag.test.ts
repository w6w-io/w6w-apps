import { assertEquals } from "@std/assert";
import { mockDripCtx } from "../_helpers.ts";
import action from "../../actions/remove-tag.ts";

Deno.test("remove-tag: DELETEs /subscribers/:idOrEmail/tags/:tag (follows the docs' curl example)", async () => {
  const { ctx, calls } = mockDripCtx([{ status: 204 }]);
  const out = await action.execute({ idOrEmail: "john@acme.com", tag: "Customer" }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.getdrip.com/v2/1234567/subscribers/john%40acme.com/tags/Customer",
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { success: true });
});
