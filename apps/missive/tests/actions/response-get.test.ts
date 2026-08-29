import { assertEquals } from "@std/assert";
import action from "../../actions/response-get.ts";
import { assertActionRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("response-get: fetches by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { responses: { id: "r1" } } }]);
  const out = await action.execute({ id: "r1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/responses/r1");
  assertEquals(out, { id: "r1" });
});

Deno.test("response-get: requires id", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ id: "" }, ctx));
});
