import { assertEquals } from "@std/assert";
import postTaskCreate from "../../actions/post-task-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("post-task-create: nests title/mediaType/custom under postDetail", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ postId: "post1" }) }]);
  const out = await postTaskCreate.execute({
    projectId: "P1",
    clipId: "C1",
    postAccountId: "pa1",
    title: "My Post",
    mediaType: "video",
    description: "desc #tag",
    privacy: "public",
  }, ctx) as { postId: string };

  assertEquals(pathOf(calls[0].url), "/api/post-tasks");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.postDetail, {
    title: "My Post",
    mediaType: "video",
    custom: { description: "desc #tag", privacy: "public" },
  });
  assertEquals(out.postId, "post1");
});

Deno.test("post-task-create: omits custom entirely when neither field is given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ postId: "post2" }) }]);
  await postTaskCreate.execute(
    { projectId: "P1", clipId: "C1", postAccountId: "pa1", title: "My Post" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.postDetail, { title: "My Post" });
});

Deno.test("post-task-create: is declared non-idempotent", () => {
  assertEquals(postTaskCreate.idempotent, false);
});
