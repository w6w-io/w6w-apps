import { assertEquals } from "@std/assert";
import createLesson from "../../actions/create-lesson.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * Heartbeat marks `hero` and `communityEmbedCards` required on this call even
 * though both may be empty/null. This is the assertion that they are always
 * sent, satisfying the requirement without this app inventing either shape.
 */
Deno.test("create-lesson: always sends hero: null and communityEmbedCards: []", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "l1" } }]);
  await createLesson.execute(
    {
      courseID: "co1",
      cohortID: "coh1",
      moduleID: "m1",
      title: "Welcome",
      content: "Hello",
      publishStatus: "DRAFT",
    },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v0/lessons");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.hero, null);
  assertEquals(body.communityEmbedCards, []);
  assertEquals(body.publishStatus, { type: "DRAFT" });
});

Deno.test("create-lesson: DRIP publish status carries numDays", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "l1" } }]);
  await createLesson.execute(
    {
      courseID: "co1",
      cohortID: "coh1",
      moduleID: "m1",
      title: "Welcome",
      content: "Hello",
      publishStatus: "DRIP",
      dripDays: 5,
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.publishStatus, { type: "DRIP", numDays: 5 });
});

Deno.test("create-lesson: is not idempotent", () => {
  assertEquals(createLesson.idempotent, false);
});
