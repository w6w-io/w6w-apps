import { assertEquals } from "@std/assert";
import accountStageList from "../../actions/account-stage-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-stage-list: GETs /account_stages with no params", async () => {
  const { ctx, calls } = mockCtx([{ body: { account_stages: [{ id: "s1", name: "Review" }] } }]);
  const out = await accountStageList.execute({}, ctx) as { account_stages: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api/v1/account_stages");
  assertEquals(out.account_stages.length, 1);
});
