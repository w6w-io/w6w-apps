import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/post-delete.ts";

const display = { siteUrl: "https://example.com" };

Deno.test("post-delete: DELETEs /posts/{id} without force by default", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute!({ postId: "42" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/wp-json/wp/v2/posts/42");
  assert(!new URL(calls[0].url).searchParams.has("force"));
});

Deno.test("post-delete: forwards force=true when the caller asks to bypass trash", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute!({ postId: "42", force: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("force"), "true");
});
