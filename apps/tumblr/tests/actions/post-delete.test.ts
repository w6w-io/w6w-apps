import { assertEquals } from "@std/assert";
import postDelete from "../../actions/post-delete.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("post-delete: POSTs the id in the body to /post/delete", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  const out = await postDelete.execute({ blogIdentifier: "staff.tumblr.com", id: 123 }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/blog/staff.tumblr.com/post/delete");
  assertEquals(JSON.parse(calls[0].body!), { id: 123 });
  assertEquals(out, { status: 200 });
});
