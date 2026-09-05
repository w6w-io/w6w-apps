import { assertEquals, assertRejects } from "@std/assert";
import downloadPageLeads from "../../actions/download-page-leads.ts";
import { envelope, errorEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("download-page-leads: calls GET /page/lead/task/download/ with business_id", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ leads: [] }) }]);

  const out = await downloadPageLeads.execute({ businessId: "biz-1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url).endsWith("/page/lead/task/download/"), true);
  assertEquals(queryOf(calls[0].url).business_id, "biz-1");
  assertEquals(out, { data: { leads: [] } });
});

Deno.test("download-page-leads: forwards filtering verbatim as JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await downloadPageLeads.execute(
    { businessId: "biz-1", filtering: { form_id: "form-9" } },
    ctx,
  );
  assertEquals(queryOf(calls[0].url).filtering, JSON.stringify({ form_id: "form-9" }));
});

Deno.test("download-page-leads: propagates a TikTok error code", async () => {
  const { ctx } = mockCtx([{ body: errorEnvelope(40105, "Access token is incorrect.") }]);
  const err = await assertRejects(async () =>
    await downloadPageLeads.execute({ businessId: "biz-1" }, ctx)
  );
  assertEquals((err as { code: number }).code, 40105);
});
