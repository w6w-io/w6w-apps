import { assertEquals } from "@std/assert";
import campaignConversionDelete from "../../actions/campaign-conversion-delete.ts";
import { mockCtx, noContentResponse } from "../_helpers.ts";

Deno.test("campaign-conversion-delete: DELETEs the compound key, no body", async () => {
  const { ctx, calls } = mockCtx([noContentResponse()]);
  const result = await campaignConversionDelete.execute(
    { campaignId: "337643194", conversionId: "70203" },
    ctx,
  );

  assertEquals(calls[0].method, "DELETE");
  assertEquals(
    calls[0].url,
    "https://api.linkedin.com/rest/campaignConversions/" +
      "(campaign:urn%3Ali%3AsponsoredCampaign%3A337643194,conversion:urn%3Alla%3AllaPartnerConversion%3A70203)",
  );
  assertEquals(calls[0].body, null);
  assertEquals(result, { ok: true });
});

Deno.test("campaign-conversion-delete: is not idempotent", () => {
  assertEquals(campaignConversionDelete.idempotent, false);
});
