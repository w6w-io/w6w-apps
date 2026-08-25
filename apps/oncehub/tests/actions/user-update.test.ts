import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-update.ts";

Deno.test("user-update: PATCHes /users/{id} with only the provided fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "USR-1" } }]);
  await action.execute({ id: "USR-1", firstName: "Andrea" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/users/USR-1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { first_name: "Andrea" });
});

Deno.test("user-update: teams replaces the full list", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ id: "USR-1", teams: ["TM-1", "TM-2"] }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { teams: ["TM-1", "TM-2"] });
});
