import { assertEquals } from "@std/assert";
import pledgeList from "../../actions/pledge-list.ts";
import { mockCtx, pageEnvelope, pathOf } from "../_helpers.ts";

Deno.test("pledge-list: hits /pledges", async () => {
  const { ctx, calls } = mockCtx([{ body: pageEnvelope([{ id: "1" }]) }]);
  await pledgeList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/pledges");
});
