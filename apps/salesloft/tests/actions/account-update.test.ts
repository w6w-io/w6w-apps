import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/account-update.ts";

Deno.test("account-update: PUTs /accounts/:id with a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 3 } } }]);
  await action.execute!({ id: 3, archived: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/accounts/3");
  assertEquals(calls[0].method, "PUT");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.archived, true);
  assertEquals(body.id, undefined);
});
