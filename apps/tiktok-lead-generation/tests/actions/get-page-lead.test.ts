import { assertEquals, assertRejects } from "@std/assert";
import getPageLead from "../../actions/get-page-lead.ts";
import { envelope, errorEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-page-lead: calls GET /page/lead/get/ with business_id + filtering", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ lead_id: "1" }) }]);

  const out = await getPageLead.execute(
    { businessId: "biz-1", filtering: { page_id: "page-1" } },
    ctx,
  );

  assertEquals(pathOf(calls[0].url).endsWith("/page/lead/get/"), true);
  const query = queryOf(calls[0].url);
  assertEquals(query.business_id, "biz-1");
  assertEquals(query.filtering, JSON.stringify({ page_id: "page-1" }));
  assertEquals(out, { data: { lead_id: "1" } });
});

Deno.test("get-page-lead: propagates a TikTok error code", async () => {
  const { ctx } = mockCtx([{ body: errorEnvelope(40105, "Access token is incorrect.") }]);
  const err = await assertRejects(async () =>
    await getPageLead.execute({ businessId: "biz-1" }, ctx)
  );
  assertEquals((err as { code: number }).code, 40105);
});
