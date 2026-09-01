import { assertEquals } from "@std/assert";
import leadConvert from "../../actions/lead-convert.ts";
import { dataEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-convert: posts to /v2/lead_conversions and maps the result fields", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: dataEnvelope({
        id: 1,
        lead_id: 2,
        individual_id: 3,
        organization_id: 4,
        deal_id: null,
      }),
    },
  ]);
  const out = await leadConvert.execute({ leadId: 2, createDeal: false }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/v2/lead_conversions");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data, { lead_id: 2, create_deal: false });
  assertEquals(out, {
    id: 1,
    leadId: 2,
    individualId: 3,
    organizationId: 4,
    dealId: null,
  });
});
