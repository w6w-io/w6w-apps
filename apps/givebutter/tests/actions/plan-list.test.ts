import { assertEquals } from "@std/assert";
import planList from "../../actions/plan-list.ts";
import { mockCtx, pageEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("plan-list: hits /plans and forwards the contacts filter", async () => {
  const { ctx, calls } = mockCtx([{ body: pageEnvelope([]) }]);
  await planList.execute({ contacts: "1,2" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/plans");
  assertEquals(queryOf(calls[0].url).contacts, "1,2");
});
