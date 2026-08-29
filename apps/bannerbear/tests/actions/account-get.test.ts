import { assertEquals } from "@std/assert";
import accountGet from "../../actions/account-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-get: GET /account, passed through unchanged", async () => {
  const { ctx, calls } = mockCtx([
    { body: { uid: "w1", workspace: "Acme", plan: "pro", quota: { max: 100, current: 1 } } },
  ]);
  const out = await accountGet.execute({}, ctx) as unknown as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/account");
  assertEquals(out.workspace, "Acme");
  assertEquals(out.plan, "pro");
});

Deno.test("account-get: takes no parameters", () => {
  assertEquals(accountGet.params?.length, 0);
});
