import { assertEquals } from "@std/assert";
import action from "../../actions/create-tag.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("create-tag: POSTs { tag } to the list's tag collection", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { tag: "vip" } }]);
  const out = await action.execute!({ listId: "l1", tag: "vip" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/lists/l1/tags");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { tag: "vip" });
  assertEquals(out, { tag: "vip" });
});

Deno.test("create-tag: is not idempotent — a duplicate tag is a 409", () => {
  assertEquals(action.idempotent, false);
});
