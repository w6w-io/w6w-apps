import { assertEquals } from "@std/assert";
import updateReviewer from "../../actions/update-reviewer.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("update-reviewer: PUTs by path id and nests the body under `reviewer`", async () => {
  const { ctx, calls } = mockCtx([{ body: { reviewer: { id: 42, email: "a@b.com" } } }]);
  const out = await updateReviewer.execute({
    id: 7,
    reviewerEmail: "a@b.com",
    name: "Jane",
  }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v1/reviewers/7");
  assertEquals(JSON.parse(calls[0].body!), { reviewer: { email: "a@b.com", name: "Jane" } });
  assertEquals(out, { reviewer: { id: 42, email: "a@b.com" } });
});

Deno.test("update-reviewer: the body's `id` is the EXTERNAL id, distinct from the path id", async () => {
  const { ctx, calls } = mockCtx([{ body: { reviewer: {} } }]);
  await updateReviewer.execute({
    id: -1,
    email: "a@b.com",
    reviewerExternalId: 9001,
    reviewerEmail: "a@b.com",
    name: "Jane",
    phone: "+123",
    tags: "vip, repeat-buyer",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v1/reviewers/-1");
  assertEquals(queryOf(calls[0].url), { email: "a@b.com" });
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.reviewer.id, 9001);
  assertEquals(sent.reviewer.tags, "vip, repeat-buyer");
});

Deno.test("update-reviewer: is marked idempotent — create-or-update is a safe retry", () => {
  assertEquals(updateReviewer.idempotent, true);
});
