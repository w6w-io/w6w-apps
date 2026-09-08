import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-delete.ts";

const display = { portalUrl: "https://myportal.bitrix24.com" };

Deno.test("contact-delete: requires confirm=true before any network call", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => {
    await action.execute({ id: 1, confirm: false }, ctx);
  });
  assertEquals(calls.length, 0);
});

Deno.test("contact-delete: calls crm.contact.delete and returns deleted:true on success", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { result: true, time: {} } },
  ], { display });

  const out = await action.execute({ id: 6, confirm: true }, ctx);

  assertEquals(calls[0].url, "https://myportal.bitrix24.com/rest/crm.contact.delete");
  assertEquals(JSON.parse(calls[0].body!), { id: 6 });
  assertEquals(out, { id: 6, deleted: true });
});
