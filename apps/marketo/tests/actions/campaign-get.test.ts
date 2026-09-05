import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/campaign-get.ts";

const conn = { display: { restBaseUrl: "https://123-abc-456.mktorest.com" } };

Deno.test("campaign-get: GETs the Asset API path, not the Lead Database path", async () => {
  const { ctx, calls } = mockCtx([
    { body: { success: true, result: [{ id: 1001, name: "Process Bounced Emails" }] } },
  ], conn);
  const out = await action.execute!({ campaignId: 1001 }, ctx);
  assertEquals(
    calls[0].url,
    "https://123-abc-456.mktorest.com/rest/asset/v1/smartCampaign/1001.json",
  );
  assertEquals(out, { id: 1001, name: "Process Bounced Emails" });
});

Deno.test("campaign-get: rejects a non-numeric campaignId", async () => {
  const { ctx } = mockCtx([], conn);
  let threw = false;
  try {
    await action.execute!({ campaignId: "abc" }, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});
