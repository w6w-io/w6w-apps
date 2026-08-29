import { assertEquals } from "@std/assert";
import leadMove from "../../actions/lead-move.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-move: POSTs /leads/move using to_campaign_id/to_list_id, not destination_*", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "job1", status: "pending" } }]);
  const out = await leadMove.execute(
    { to_campaign_id: "c2", campaign: "c1" },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/leads/move");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.to_campaign_id, "c2");
  assertEquals(body.campaign, "c1");
  assertEquals("destination_campaign_id" in body, false);
  assertEquals(out.id, "job1");
});

Deno.test("lead-move: ids accepts a comma string", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await leadMove.execute({ to_list_id: "list2", campaign: "c1", ids: "a,b" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).ids, ["a", "b"]);
});

Deno.test("lead-move: returns a background job — not marked idempotent", () => {
  assertEquals(leadMove.idempotent, false);
});
