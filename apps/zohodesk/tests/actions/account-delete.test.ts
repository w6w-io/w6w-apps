import { assertEquals } from "@std/assert";
import { mockDeskCtx } from "../_helpers.ts";
import action from "../../actions/account-delete.ts";

Deno.test("account-delete: POSTs /accounts/moveToTrash with an accountIds array", async () => {
  const { ctx, calls } = mockDeskCtx([{ status: 204 }]);
  const out = await action.execute({ recordId: "3" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/accounts/moveToTrash");
  assertEquals(JSON.parse(calls[0].body!), { accountIds: ["3"] });
  assertEquals(out, { deleted: true });
});
