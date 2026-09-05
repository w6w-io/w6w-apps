import { assertEquals, assertRejects } from "@std/assert";
import blogInfoGet from "../../actions/blog-info-get.ts";
import { envelope, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("blog-info-get: calls GET /v2/blog/{id}/info and returns the blog", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ blog: { name: "staff", title: "Staff", posts: 3456 } }) },
  ]);
  const out = await blogInfoGet.execute({ blogIdentifier: "staff.tumblr.com" }, ctx) as {
    blog: { name: string };
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/blog/staff.tumblr.com/info");
  assertEquals(out.blog.name, "staff");
});

Deno.test("blog-info-get: a Tumblr error surfaces its machine-readable code", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody(0, "Blog was not found.", 404, "Not Found"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(blogInfoGet.execute({ blogIdentifier: "nope.tumblr.com" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("code 0"), true, err.message);
  assertEquals(err.message.includes("Blog was not found."), true, err.message);
});
