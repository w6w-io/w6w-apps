import { assertEquals } from "@std/assert";
import subAccountGet from "../../actions/sub-account-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("sub-account-get: calls GET /sub_accounts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1552433", name: "Default Client" } }]);
  const out = await subAccountGet.execute({ subAccountId: "1552433" }, ctx) as { name: string };

  assertEquals(pathOf(calls[0].url), "/sub_accounts/1552433");
  assertEquals(out.name, "Default Client");
});
