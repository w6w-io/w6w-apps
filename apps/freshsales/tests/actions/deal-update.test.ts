import { assertEquals } from "@std/assert";
import { mockFreshsalesCtx } from "../_helpers.ts";
import action from "../../actions/deal-update.ts";

Deno.test("deal-update: PUTs to /deals/:id with only the set fields", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { deal: { id: 1 } } }]);
  const out = await action.execute({ dealId: 1, amount: 5000 }, ctx);
  assertEquals(calls[0].url, "https://acme.myfreshworks.com/crm/sales/api/deals/1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { deal: { amount: 5000 } });
  assertEquals(out, { id: 1 });
});

Deno.test("deal-update: forwards expectedClose and dealStageId under their wire names", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { deal: {} } }]);
  await action.execute({ dealId: 1, expectedClose: "2026-12-01", dealStageId: 3 }, ctx);
  assertEquals(
    JSON.parse(calls[0].body!),
    { deal: { expected_close: "2026-12-01", deal_stage_id: 3 } },
  );
});
