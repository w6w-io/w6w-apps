import { assert, assertEquals, assertRejects } from "@std/assert";
import draftCreate from "../../actions/draft-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("draft-create: posts the platforms object and optional fields", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: 99, status: "draft", platforms: {} },
  }]);
  const platforms = { x: { enabled: true, posts: [{ text: "Hello world!" }] } };
  const out = await draftCreate.execute({
    socialSetId: 4,
    platforms,
    draftTitle: "Launch post",
    tags: "marketing, launch",
    share: true,
  }, ctx) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/social-sets/4/drafts");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.platforms, platforms);
  assertEquals(body.draft_title, "Launch post");
  assertEquals(body.tags, ["marketing", "launch"]);
  assertEquals(body.share, true);
  assertEquals(out.id, 99);
});

Deno.test("draft-create: accepts platforms as a JSON string, same as a parsed object", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await draftCreate.execute({
    socialSetId: 1,
    platforms: JSON.stringify({ x: { enabled: true, posts: [{ text: "hi" }] } }),
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.platforms.x.enabled, true);
});

Deno.test("draft-create: rejects invalid JSON in platforms before making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await draftCreate.execute({ socialSetId: 1, platforms: "{not json" }, ctx),
  );
  assertEquals(calls.length, 0);
});

Deno.test("draft-create: is not idempotent — Typefully documents no dedupe key", () => {
  assertEquals(draftCreate.idempotent, false);
});

Deno.test("draft-create: publishAt and planAt are omitted, not sent as empty strings, by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await draftCreate.execute({
    socialSetId: 1,
    platforms: { x: { enabled: true, posts: [{ text: "hi" }] } },
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assert(!("publish_at" in body));
  assert(!("plan_at" in body));
});
