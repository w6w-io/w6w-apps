import { assertEquals } from "@std/assert";
import { mockInventoryCtx } from "../_helpers.ts";
import action from "../../actions/contact-get.ts";

Deno.test("contact-get: GETs /contacts/{id} with organization_id and unwraps contact", async () => {
  const { ctx, calls } = mockInventoryCtx([
    { body: { code: 0, message: "success", contact: { contact_id: "1", contact_name: "Acme" } } },
  ]);
  const out = await action.execute({ recordId: "1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/inventory/v1/contacts/1");
  assertEquals(url.searchParams.get("organization_id"), "10234695");
  assertEquals(out, { contact_id: "1", contact_name: "Acme" });
});

Deno.test("contact-get: percent-encodes the id rather than letting it retarget the path", async () => {
  const { ctx, calls } = mockInventoryCtx([
    { body: { code: 0, message: "success", contact: { contact_id: "1" } } },
  ]);
  await action.execute({ recordId: "1/../2" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/inventory/v1/contacts/1%2F..%2F2");
});

Deno.test("contact-get: an envelope without the contact key throws instead of returning undefined", async () => {
  const { ctx } = mockInventoryCtx([{ body: { code: 0, message: "success" } }]);
  let threw = false;
  try {
    await action.execute({ recordId: "1" }, ctx);
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message.includes('no "contact" key'), true);
  }
  assertEquals(threw, true);
});
