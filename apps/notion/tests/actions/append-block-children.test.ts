import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/append-block-children.ts";

Deno.test("append-block-children: PATCHes /blocks/{id}/children with the children array", async () => {
  const children = [
    { object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: "hi" } }] } },
  ];
  const { ctx, calls } = mockCtx([{ body: { object: "list", results: children } }]);
  await action.execute({ blockId: "blk-1", children, after: "blk-anchor" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/blocks/blk-1/children");
  assertEquals(calls[0].method, "PATCH");
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.children, children);
  assertEquals(sent.after, "blk-anchor");
});
