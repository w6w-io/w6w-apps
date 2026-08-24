import { assertEquals } from "@std/assert";
import contactFieldUpdate from "../../actions/contact-field-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-field-update: PATCHes {fieldName} to /api/contact_fields/{slug}", async () => {
  const { ctx, calls } = mockCtx([{ body: { slug: "vip_since", fieldName: "Renamed" } }]);
  await contactFieldUpdate.execute({ slug: "vip_since", fieldName: "Renamed" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/contact_fields/vip_since");
  assertEquals(calls[0].headers["content-type"], "application/merge-patch+json");
  assertEquals(JSON.parse(calls[0].body!), { fieldName: "Renamed" });
});
