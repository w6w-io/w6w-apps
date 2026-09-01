import { assertEquals } from "@std/assert";
import dealUpdate from "../../actions/deal-update.ts";
import { dataEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("deal-update: PUTs a stage move", async () => {
  const { ctx, calls } = mockCtx([{ body: dataEnvelope({ id: 1, stage_id: 2 }) }]);
  await dealUpdate.execute({ id: 1, stageId: 2 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/deals/1");
  assertEquals(calls[0].method, "PUT");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data, { stage_id: 2 });
});
