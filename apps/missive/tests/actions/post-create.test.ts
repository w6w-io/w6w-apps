import { assertEquals } from "@std/assert";
import action from "../../actions/post-create.ts";
import { assertActionRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("post-create: posts notification + text, returns conversation/id", async () => {
  const { ctx, calls } = mockCtx([{ body: { posts: { conversation: "c1", id: "p1" } } }]);
  const out = await action.execute(
    {
      notificationTitle: "Ticket resolved",
      notificationBody: "Closed",
      text: "Ticket #1234 resolved.",
      close: true,
      conversation: "c1",
    },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/posts");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.posts.notification, { title: "Ticket resolved", body: "Closed" });
  assertEquals(body.posts.close, true);
  assertEquals(body.posts.conversation, "c1");
  assertEquals(out, { conversation: "c1", id: "p1" });
});

Deno.test("post-create: requires notification title and body", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() =>
    action.execute({ notificationTitle: "", notificationBody: "", text: "x" }, ctx)
  );
});

Deno.test("post-create: requires text, markdown, or attachments", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() =>
    action.execute({ notificationTitle: "t", notificationBody: "b" }, ctx)
  );
});
