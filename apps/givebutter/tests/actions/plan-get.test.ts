import { assertEquals } from "@std/assert";
import planGet from "../../actions/plan-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("plan-get: fetches /plans/{uid} and forwards the undocumented extra query params", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "plan_1", status: "active" }) }]);
  const out = await planGet.execute({ id: "plan_1", email: "a@b.com" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/plans/plan_1");
  assertEquals(queryOf(calls[0].url), { email: "a@b.com" });
  assertEquals(out, { id: "plan_1", status: "active" });
});
