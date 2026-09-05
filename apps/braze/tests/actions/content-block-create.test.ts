import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/content-block-create.ts";

Deno.test("content-block-create: posts name, content, state and tags", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { content_block_id: "cb1" } }], {
    display: { instance: "iad-01" },
  });
  await action.execute!({
    name: "footer",
    content: "<p>bye</p>",
    state: "draft",
    tags: ["marketing"],
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    name: "footer",
    content: "<p>bye</p>",
    state: "draft",
    tags: ["marketing"],
  });
});
