import { assertEquals } from "@std/assert";
import getAccount from "../../actions/get-account.ts";
import { mockCtx, rpcBody } from "../_helpers.ts";

Deno.test("get-account: is a read action requiring accountId", () => {
  assertEquals(getAccount.type, "read");
  assertEquals(getAccount.params?.find((p) => p.key === "accountId")?.required, true);
});

Deno.test("get-account: calls getAccount with a numeric accountId", async () => {
  const { ctx, calls } = mockCtx([{ result: { id: 1, name: "Acme Corp" } }]);
  const result = await getAccount.execute({ accountId: "1" }, ctx);

  assertEquals(rpcBody(calls[0]).method, "getAccount");
  assertEquals(rpcBody(calls[0]).params, { accountId: 1 });
  assertEquals(result.name, "Acme Corp");
});
