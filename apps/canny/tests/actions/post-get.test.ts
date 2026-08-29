import { assertEquals } from "@std/assert";
import postGet from "../../actions/post-get.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("post-get: retrieves by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "p1", title: "Dark mode" } }]);
  await postGet.execute({ id: "p1" }, ctx);

  assertEquals(calls[0].url, "https://canny.io/api/v1/posts/retrieve");
  assertEquals(bodyOf(calls[0]), { id: "p1" });
});

Deno.test("post-get: retrieves by boardID + urlName", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "p1" } }]);
  await postGet.execute({ boardID: "b1", urlName: "dark-mode" }, ctx);

  assertEquals(bodyOf(calls[0]), { boardID: "b1", urlName: "dark-mode" });
});
