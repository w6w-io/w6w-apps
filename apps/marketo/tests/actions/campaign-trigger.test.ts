import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/campaign-trigger.ts";

const conn = { display: { restBaseUrl: "https://123-abc-456.mktorest.com" } };

Deno.test("campaign-trigger: POSTs to /rest/v1/campaigns/{id}/trigger.json", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, result: [{ id: 3712 }] } }], conn);
  const out = await action.execute!({ campaignId: 1069, leadIds: "318592,318593" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(
    calls[0].url,
    "https://123-abc-456.mktorest.com/rest/v1/campaigns/1069/trigger.json",
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.input.leads, [{ id: 318592 }, { id: 318593 }]);
  assertEquals(out, { id: 3712 });
});

Deno.test("campaign-trigger: converts a tokens JSON map into the name/value array Marketo expects", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, result: [{ id: 1 }] } }], conn);
  await action.execute!(
    { campaignId: 1, leadIds: "1", tokens: '{"{{my.message}}": "Updated message"}' },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.input.tokens, [{ name: "{{my.message}}", value: "Updated message" }]);
});

Deno.test("campaign-trigger: requires at least one lead ID", async () => {
  const { ctx } = mockCtx([], conn);
  let threw = false;
  try {
    await action.execute!({ campaignId: 1, leadIds: "" }, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("campaign-trigger: idempotent is false — running the flow again is the entire point", () => {
  assertEquals(action.idempotent, false);
});
