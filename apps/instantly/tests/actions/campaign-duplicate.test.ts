import { assertEquals } from "@std/assert";
import campaignDuplicate from "../../actions/campaign-duplicate.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-duplicate: POSTs /campaigns/{id}/duplicate with the new name", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c2", name: "My Campaign (copy)" } }]);
  const out = await campaignDuplicate.execute(
    { id: "c1", name: "My Campaign (copy)" },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/campaigns/c1/duplicate");
  assertEquals(JSON.parse(calls[0].body!), { name: "My Campaign (copy)" });
  assertEquals(out.id, "c2");
});

Deno.test("campaign-duplicate: is declared non-idempotent — every call creates another campaign", () => {
  assertEquals(campaignDuplicate.idempotent, false);
});
