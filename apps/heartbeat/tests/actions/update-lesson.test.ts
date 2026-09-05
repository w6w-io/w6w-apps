import { assertEquals } from "@std/assert";
import updateLesson from "../../actions/update-lesson.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("update-lesson: only provided fields sent — no hero/communityEmbedCards forced", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "l1", title: "New title" } }]);
  await updateLesson.execute({ lessonID: "l1", title: "New title" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v0/lessons/l1");
  assertEquals(JSON.parse(calls[0].body!), { title: "New title" });
});

Deno.test("update-lesson: SCHEDULE_PUBLISH carries the date", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "l1" } }]);
  await updateLesson.execute(
    {
      lessonID: "l1",
      publishStatus: "SCHEDULE_PUBLISH",
      scheduledPublishAt: "2026-12-01T00:00:00Z",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.publishStatus, { type: "SCHEDULE_PUBLISH", date: "2026-12-01T00:00:00Z" });
});

Deno.test("update-lesson: is idempotent", () => {
  assertEquals(updateLesson.idempotent, true);
});
