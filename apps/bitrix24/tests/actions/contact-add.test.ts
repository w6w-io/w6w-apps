import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-add.ts";

const display = { portalUrl: "https://myportal.bitrix24.com" };

Deno.test("contact-add: posts fields to crm.contact.add and returns the new id", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { result: 11, time: {} } },
  ], { display });

  const out = await action.execute({
    name: "Ada",
    lastName: "Lovelace",
    opened: true,
    phone: "5551234",
  }, ctx);

  assertEquals(calls[0].url, "https://myportal.bitrix24.com/rest/crm.contact.add");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.fields.NAME, "Ada");
  assertEquals(body.fields.LAST_NAME, "Lovelace");
  assertEquals(body.fields.OPENED, "Y");
  assertEquals(body.fields.PHONE, [{ VALUE: "5551234", VALUE_TYPE: "WORK" }]);
  assertEquals(out, { id: 11 });
});

Deno.test("contact-add: opened=false is sent as 'N', not dropped", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { result: 1, time: {} } },
  ], { display });
  await action.execute({ lastName: "X", opened: false }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.fields.OPENED, "N");
});
