import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deal-delete.ts";

const display = { portalUrl: "https://myportal.bitrix24.com" };

Deno.test("deal-delete: requires confirm=true before any network call", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => {
    await action.execute({ id: 1, confirm: false }, ctx);
  });
  assertEquals(calls.length, 0);
});

Deno.test("deal-delete: calls crm.deal.delete and returns deleted:true on success", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { result: true, time: {} } },
  ], { display });

  const out = await action.execute({ id: 30, confirm: true }, ctx);

  assertEquals(calls[0].url, "https://myportal.bitrix24.com/rest/crm.deal.delete");
  assertEquals(JSON.parse(calls[0].body!), { id: 30 });
  assertEquals(out, { id: 30, deleted: true });
});
