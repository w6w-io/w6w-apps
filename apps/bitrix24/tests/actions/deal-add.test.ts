import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deal-add.ts";

const display = { portalUrl: "https://myportal.bitrix24.com" };

Deno.test("deal-add: posts fields to crm.deal.add and returns the new id", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { result: 100, time: {} } },
  ], { display });

  const out = await action.execute({
    title: "Big Deal",
    opportunity: 5000,
    contactIds: "[12,34]",
  }, ctx);

  assertEquals(calls[0].url, "https://myportal.bitrix24.com/rest/crm.deal.add");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.fields.TITLE, "Big Deal");
  assertEquals(body.fields.OPPORTUNITY, 5000);
  assertEquals(body.fields.CONTACT_IDS, [12, 34]);
  assertEquals(out, { id: 100 });
});

Deno.test("deal-add: rejects contactIds that are not a JSON array", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => {
    await action.execute({ title: "x", contactIds: '{"not":"array"}' }, ctx);
  });
});
