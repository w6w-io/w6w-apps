import { assertEquals, assertRejects } from "@std/assert";
import getLeadFields from "../../actions/get-lead-fields.ts";
import { envelope, errorEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-lead-fields: calls GET /lead/field/get/ with advertiser_id + filtering", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ fields: [{ name: "email" }] }) },
  ]);

  const out = await getLeadFields.execute(
    { advertiserId: "adv-1", filtering: { form_id: "form-1" } },
    ctx,
  );

  assertEquals(pathOf(calls[0].url).endsWith("/lead/field/get/"), true);
  const query = queryOf(calls[0].url);
  assertEquals(query.advertiser_id, "adv-1");
  assertEquals(query.filtering, JSON.stringify({ form_id: "form-1" }));
  assertEquals(out, { data: { fields: [{ name: "email" }] } });
});

Deno.test("get-lead-fields: propagates a TikTok error code", async () => {
  const { ctx } = mockCtx([{ body: errorEnvelope(40002, "Missing required field(s).") }]);
  const err = await assertRejects(async () =>
    await getLeadFields.execute({ advertiserId: "adv-1" }, ctx)
  );
  assertEquals((err as { code: number }).code, 40002);
});
