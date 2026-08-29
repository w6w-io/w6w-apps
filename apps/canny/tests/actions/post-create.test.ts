import { assertEquals } from "@std/assert";
import postCreate from "../../actions/post-create.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("post-create: posts required + optional fields, parsing customFields JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "p1" } }]);
  const out = await postCreate.execute(
    {
      authorID: "u1",
      boardID: "b1",
      title: "Dark mode",
      details: "Please add a dark theme.",
      customFields: '{"priority":"high"}',
      imageURLs: ["https://x/1.png", "https://x/2.png"],
    },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].url, "https://canny.io/api/v1/posts/create");
  assertEquals(bodyOf(calls[0]), {
    authorID: "u1",
    boardID: "b1",
    title: "Dark mode",
    details: "Please add a dark theme.",
    customFields: { priority: "high" },
    imageURLs: ["https://x/1.png", "https://x/2.png"],
  });
  assertEquals(out.id, "p1");
});

Deno.test("post-create: is not idempotent", () => {
  assertEquals(postCreate.idempotent, false);
});
