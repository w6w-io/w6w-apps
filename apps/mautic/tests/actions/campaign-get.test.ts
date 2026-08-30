import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/campaign-get.ts";

const conn = { display: { baseUrl: "https://mautic.example.com" } };

Deno.test("campaign-get: GETs /campaigns/{id} and unwraps the `campaign` envelope", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { campaign: { id: 3, name: "Welcome" } } }],
    conn,
  );
  const out = await action.execute!({ campaignId: 3 }, ctx);
  assertEquals(calls[0].url, "https://mautic.example.com/api/campaigns/3");
  assertEquals(out, { id: 3, name: "Welcome" });
});
