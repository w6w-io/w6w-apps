import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/usergroup-create.ts";

Deno.test("usergroup-create: POSTs /usergroups.create with name and options", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, usergroup: { id: "S1" } } }]);
  const result = await action.execute!({ name: "team", handle: "team", channels: "C1,C2" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/usergroups.create");
  assertEquals(JSON.parse(calls[0].body!), { name: "team", handle: "team", channels: "C1,C2" });
  assertEquals(result, { id: "S1" });
});
