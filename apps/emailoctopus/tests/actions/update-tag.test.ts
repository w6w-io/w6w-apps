import { assertEquals } from "@std/assert";
import action from "../../actions/update-tag.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("update-tag: the path carries the old tag and the body the new one", async () => {
  const { ctx, calls } = mockCtx([{ body: { tag: "vip-2026" } }]);
  await action.execute!({ listId: "l1", currentTag: "vip", tag: "vip-2026" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/lists/l1/tags/vip");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { tag: "vip-2026" });
});

Deno.test("update-tag: percent-encodes a tag with a space", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ listId: "l1", currentTag: "very important", tag: "vip" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/lists/l1/tags/very%20important");
});
