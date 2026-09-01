import { assertEquals } from "@std/assert";
import { mockFreshBooksCtx } from "../_helpers.ts";
import action from "../../actions/client-get.ts";

Deno.test("client-get: GETs /users/clients/{clientId}", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: { response: { result: { client: {} } } } }]);
  await action.execute({ clientId: "c1" }, ctx);
  assertEquals(calls[0].url, "https://api.freshbooks.com/accounting/account/acc1/users/clients/c1");
  assertEquals(calls[0].method, "GET");
});
