import { assertEquals } from "@std/assert";
import disputeList from "../../actions/dispute-list.ts";
import { collection, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("dispute-list: lists /disputes", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([{ id: "disp_1" }]) }]);
  const out = await disputeList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/disputes");
  assertEquals(out, collection([{ id: "disp_1" }]));
});
