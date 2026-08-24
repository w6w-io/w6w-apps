import { assertEquals } from "@std/assert";
import campaignUpdate from "../../actions/campaign-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-update: merge-patches /api/mailing/campaigns/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "Renamed" } }]);
  await campaignUpdate.execute({ id: "1", name: "Renamed" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/mailing/campaigns/1");
  assertEquals(calls[0].headers["content-type"], "application/merge-patch+json");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed" });
});
