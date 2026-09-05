import { assertEquals } from "@std/assert";
import campaignDelete from "../../actions/campaign-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-delete: DELETEs /v2/campaigns with ids[] query and filter body", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, message: "Deleted" } }]);
  await campaignDelete.execute({ ids: ["c1", "c2"], status: "DRAFT" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/campaigns");
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("ids[]"), ["c1", "c2"]);
  assertEquals(JSON.parse(calls[0].body!), { status: "DRAFT" });
});

Deno.test('campaign-delete: accepts the literal "all" as a single string id', async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, message: "Deleted" } }]);
  await campaignDelete.execute({ ids: "all" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("ids[]"), ["all"]);
});
