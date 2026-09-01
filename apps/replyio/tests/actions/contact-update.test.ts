import { assertEquals } from "@std/assert";
import contactUpdate from "../../actions/contact-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-update: PATCHes only the fields provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42, firstName: "Ada" } }]);
  await contactUpdate.execute({ id: 42, firstName: "Ada" }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v3/contacts/42");
  assertEquals(JSON.parse(calls[0].body!), { firstName: "Ada" });
});

/**
 * Reply's OpenAPI document states explicitly: the PATCH customFields shape is
 * `{id|name, value}`, NOT the `{key, value}` shape create/read use. This is
 * the one behaviour worth pinning — using the wrong shape silently fails to
 * match an existing field.
 */
Deno.test("contact-update: customFields uses {id|name, value}, not {key, value}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42 } }]);
  await contactUpdate.execute(
    { id: 42, customFields: '[{"name":"leadSource","value":"Conference"}]' },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.customFields, [{ name: "leadSource", value: "Conference" }]);
});

Deno.test('contact-update: callStatus/meetingStatus accept the literal "none" to clear', async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42 } }]);
  await contactUpdate.execute({ id: 42, callStatus: "none", meetingStatus: "none" }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.callStatus, "none");
  assertEquals(body.meetingStatus, "none");
});

Deno.test("contact-update: is idempotent — re-applying the same patch is a no-op", () => {
  assertEquals(contactUpdate.idempotent, true);
});
