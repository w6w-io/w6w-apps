import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/usergroup-update.ts";

Deno.test("usergroup-update: POSTs /usergroups.update with usergroup id and updated fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, usergroup: { id: "S1" } } }]);
  await action.execute!({ userGroupId: "S1", name: "new name", handle: "new" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/usergroups.update");
  assertEquals(JSON.parse(calls[0].body!), { usergroup: "S1", name: "new name", handle: "new" });
});
