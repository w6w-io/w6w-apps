import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-list.ts";

const display = { portalUrl: "https://myportal.bitrix24.com" };

Deno.test("contact-list: sends filter/select/order/start and returns total + next", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { result: [{ ID: "1" }], total: 1, time: {} } },
  ], { display });

  const out = await action.execute({
    select: '["ID","LAST_NAME"]',
    filter: '{"%LAST_NAME":"love"}',
  }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.select, ["ID", "LAST_NAME"]);
  assertEquals(body.filter, { "%LAST_NAME": "love" });
  assertEquals(out.results, [{ ID: "1" }]);
  assertEquals(out.total, 1);
});

Deno.test("contact-list: rejects a select that is not a JSON array", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => {
    await action.execute({ select: '{"not":"array"}' }, ctx);
  });
});
