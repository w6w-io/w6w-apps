import { assertEquals } from "@std/assert";
import getLeadIdsForBusiness from "../../actions/get-lead-ids-for-business.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-lead-ids-for-business: no optional params sends no query", async () => {
  const { ctx, calls } = mockCtx([{ body: { lead_ids: [], has_more: false } }]);
  await getLeadIdsForBusiness.execute({ businessId: "biz1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/businesses/biz1/lead_ids");
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("get-lead-ids-for-business: forwards pagination and time-range params", async () => {
  const { ctx, calls } = mockCtx([{ body: { lead_ids: [], has_more: false } }]);
  await getLeadIdsForBusiness.execute(
    {
      businessId: "biz1",
      limit: 5,
      afterLeadId: "lead-9",
      createdAfter: "2024-06-30T00:00:00Z",
      createdBefore: "2024-07-01T00:00:00Z",
    },
    ctx,
  );

  assertEquals(queryOf(calls[0].url), {
    limit: "5",
    after_lead_id: "lead-9",
    created_after: "2024-06-30T00:00:00Z",
    created_before: "2024-07-01T00:00:00Z",
  });
});

Deno.test("get-lead-ids-for-business: returns lead_ids and has_more", async () => {
  const body = { lead_ids: ["18kPq7GPye-YQ3LyKyAZPw", "loPSlzp6M628rzyCRPqrv3tC"], has_more: true };
  const { ctx } = mockCtx([{ body }]);
  const result = await getLeadIdsForBusiness.execute({ businessId: "biz1" }, ctx);
  assertEquals(result, body);
});
