import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/post-get.ts";

const display = { siteUrl: "https://example.com" };

Deno.test("post-get: GETs /posts/{id} and returns the response", async () => {
  const body = { id: 42, title: { rendered: "Hi" } };
  const { ctx, calls } = mockCtx([{ body }], { display });
  const result = await action.execute!({ postId: "42" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/wp-json/wp/v2/posts/42");
  assertEquals(result, body);
});

Deno.test("post-get: forwards password and context when provided", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute!({ postId: "42", password: "sekret", context: "edit" }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("password"), "sekret");
  assertEquals(params.get("context"), "edit");
});
