import { assertEquals } from "@std/assert";
import action from "../../actions/create-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("create-list: POSTs { name } to /lists as JSON", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "l1", name: "New clients list" } }]);
  const out = await action.execute!({ name: "New clients list" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/lists");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "New clients list" });
  assertEquals(out, { id: "l1", name: "New clients list" });
});

Deno.test("create-list: is not idempotent — EmailOctopus does not dedupe list names", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
