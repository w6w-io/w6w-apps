import { assertEquals } from "@std/assert";
import contactFieldDelete from "../../actions/contact-field-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-field-delete: DELETEs /api/contact_fields/{slug}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await contactFieldDelete.execute({ slug: "vip_since" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/contact_fields/vip_since");
  assertEquals(out, { status: 204 });
});
