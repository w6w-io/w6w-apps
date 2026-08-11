import { assert, assertEquals } from "@std/assert";
import campaignRecipientsGet from "../../actions/campaign-recipients-get.ts";
import { API_PATH, mockCtx, pagedBody, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-recipients-get: GETs /campaigns/{campaignid}/recipients.json", async () => {
  const { ctx, calls } = mockCtx([{
    body: pagedBody([{ EmailAddress: "a@b.com", ListID: "l1" }]),
  }]);
  const out = await campaignRecipientsGet.execute({ campaignId: "cmp", page: 2 }, ctx);
  assertEquals(pathOf(calls[0].url), `${API_PATH}/campaigns/cmp/recipients.json`);
  assertEquals(queryOf(calls[0].url), { page: "2" });
  assertEquals(out.Results[0].ListID, "l1");
});

/**
 * This endpoint takes no date and orders by email|list only. Offering a `date`
 * param would be offering something the endpoint rejects — which is exactly why
 * it is a separate action from the five interaction reports.
 */
Deno.test("campaign-recipients-get: exposes no date param and only two order fields", () => {
  const keys = (campaignRecipientsGet.params ?? []).map((p) => p.key);
  assert(!keys.includes("date"), "a recipient list has no per-record timestamp");
  const options = (campaignRecipientsGet.params ?? [])
    .find((p) => p.key === "orderField")?.options as Array<{ value: string }>;
  assertEquals(options.map((o) => o.value), ["email", "list"]);
});
