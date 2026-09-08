import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/lead-list.ts";

const display = { portalUrl: "https://myportal.bitrix24.com" };

Deno.test("lead-list: sends filter/select/order/start and returns total + next", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { result: [{ ID: "1" }], total: 51, next: 50, time: {} } },
  ], { display });

  const out = await action.execute({
    select: '["ID","TITLE"]',
    filter: '{"STATUS_ID":"NEW"}',
    order: '{"DATE_CREATE":"DESC"}',
    start: 0,
  }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.select, ["ID", "TITLE"]);
  assertEquals(body.filter, { STATUS_ID: "NEW" });
  assertEquals(body.order, { DATE_CREATE: "DESC" });
  assertEquals(body.start, 0);
  assertEquals(out.results, [{ ID: "1" }]);
  assertEquals(out.total, 51);
  assertEquals(out.next, 50);
});

Deno.test("lead-list: next is absent once every match has been returned", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { result: [], total: 0, time: {} } },
  ], { display });
  const out = await action.execute({}, ctx);
  assertEquals(out.next, undefined);
});

Deno.test("lead-list: rejects a filter that is not a JSON object", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => {
    await action.execute({ filter: '["not","an","object"]' }, ctx);
  });
});
