import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/campaign-schedule.ts";

const conn = { display: { restBaseUrl: "https://123-abc-456.mktorest.com" } };

Deno.test("campaign-schedule: POSTs to /rest/v1/campaigns/{id}/schedule.json", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, result: [{ id: 3713 }] } }], conn);
  const out = await action.execute!({ campaignId: 3713, runAt: "2018-03-28T18:05:00+0000" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(
    calls[0].url,
    "https://123-abc-456.mktorest.com/rest/v1/campaigns/3713/schedule.json",
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.input.runAt, "2018-03-28T18:05:00+0000");
  assertEquals(out, { id: 3713 });
});

Deno.test("campaign-schedule: omits runAt when left blank, letting Marketo default to +5 minutes", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, result: [{ id: 1 }] } }], conn);
  await action.execute!({ campaignId: 1 }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.input.runAt, undefined);
});

Deno.test("campaign-schedule: idempotent is false — each call schedules another run", () => {
  assertEquals(action.idempotent, false);
});
