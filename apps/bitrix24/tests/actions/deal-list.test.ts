import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deal-list.ts";

const display = { portalUrl: "https://myportal.bitrix24.com" };

Deno.test("deal-list: sends filter and returns total + next", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { result: [{ ID: "1" }], total: 200, next: 50, time: {} } },
  ], { display });

  const out = await action.execute({ filter: '{">=OPPORTUNITY":1000}', start: 0 }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.filter, { ">=OPPORTUNITY": 1000 });
  assertEquals(out.results, [{ ID: "1" }]);
  assertEquals(out.total, 200);
  assertEquals(out.next, 50);
});

Deno.test("deal-list: rejects an order that is not a JSON object", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => {
    await action.execute({ order: '["not","an","object"]' }, ctx);
  });
});
