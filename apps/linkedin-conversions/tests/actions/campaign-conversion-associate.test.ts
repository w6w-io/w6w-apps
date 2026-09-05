import { assertEquals } from "@std/assert";
import campaignConversionAssociate from "../../actions/campaign-conversion-associate.ts";
import { mockCtx, noContentResponse } from "../_helpers.ts";

Deno.test("campaign-conversion-associate: PUTs the compound key with both URNs in the body", async () => {
  const { ctx, calls } = mockCtx([noContentResponse()]);
  const result = await campaignConversionAssociate.execute(
    { campaignId: "337643194", conversionId: "70203" },
    ctx,
  );

  assertEquals(calls[0].method, "PUT");
  assertEquals(
    calls[0].url,
    "https://api.linkedin.com/rest/campaignConversions/" +
      "(campaign:urn%3Ali%3AsponsoredCampaign%3A337643194,conversion:urn%3Alla%3AllaPartnerConversion%3A70203)",
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    campaign: "urn:li:sponsoredCampaign:337643194",
    conversion: "urn:lla:llaPartnerConversion:70203",
  });
  assertEquals(result, { ok: true });
});

Deno.test("campaign-conversion-associate: accepts a full URN as well as a bare id", async () => {
  const { ctx, calls } = mockCtx([noContentResponse()]);
  await campaignConversionAssociate.execute(
    {
      campaignId: "urn:li:sponsoredCampaign:1",
      conversionId: "urn:lla:llaPartnerConversion:2",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.campaign, "urn:li:sponsoredCampaign:1");
  assertEquals(body.conversion, "urn:lla:llaPartnerConversion:2");
});

Deno.test("campaign-conversion-associate: is idempotent", () => {
  assertEquals(campaignConversionAssociate.idempotent, true);
});
