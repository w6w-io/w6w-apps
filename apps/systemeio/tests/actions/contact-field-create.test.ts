import { assertEquals } from "@std/assert";
import contactFieldCreate from "../../actions/contact-field-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-field-create: POSTs {fieldName, slug} to /api/contact_fields", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { slug: "vip_since", fieldName: "VIP since" },
  }]);
  const out = await contactFieldCreate.execute({ fieldName: "VIP since", slug: "vip_since" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/contact_fields");
  assertEquals(JSON.parse(calls[0].body!), { fieldName: "VIP since", slug: "vip_since" });
  assertEquals(out, { slug: "vip_since", fieldName: "VIP since" });
});
