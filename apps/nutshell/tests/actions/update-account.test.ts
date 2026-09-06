import { assertEquals } from "@std/assert";
import updateAccount from "../../actions/update-account.ts";
import { mockCtx, rpcBody } from "../_helpers.ts";

Deno.test("update-account: is a non-idempotent perform action requiring rev", () => {
  assertEquals(updateAccount.type, "perform");
  assertEquals(updateAccount.idempotent, false);
  assertEquals(updateAccount.params?.find((p) => p.key === "rev")?.required, true);
});

Deno.test("update-account: sends accountId, rev, and the account diff", async () => {
  const { ctx, calls } = mockCtx([{ result: { id: 1, rev: "6" } }]);
  await updateAccount.execute({ accountId: "1", rev: "5", name: "New Name" }, ctx);

  assertEquals(rpcBody(calls[0]).method, "editAccount");
  const params = rpcBody(calls[0]).params;
  assertEquals(params.accountId, 1);
  assertEquals(params.rev, "5");
  assertEquals(params.account, { name: "New Name" });
});
