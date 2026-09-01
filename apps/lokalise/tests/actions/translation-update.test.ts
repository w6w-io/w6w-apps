import { assertEquals } from "@std/assert";
import translationUpdate from "../../actions/translation-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("translation-update: a plain-text translation is sent as-is, not JSON-parsed", async () => {
  const { ctx, calls } = mockCtx([{ body: { translation_id: 1, translation: "Hello world" } }]);
  await translationUpdate.execute(
    { projectId: "p1", translationId: 1, translation: "Hello world" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1/translations/1");
  assertEquals(JSON.parse(calls[0].body!), { translation: "Hello world" });
});

Deno.test("translation-update: a plural JSON-object translation is parsed before sending", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await translationUpdate.execute(
    { projectId: "p1", translationId: 1, translation: '{"one":"1 apple","other":"apples"}' },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { translation: { one: "1 apple", other: "apples" } });
});

Deno.test("translation-update: forwards review flags alongside the text", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await translationUpdate.execute(
    { projectId: "p1", translationId: 1, isReviewed: true, isUnverified: false },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { is_reviewed: true, is_unverified: false });
});

Deno.test("translation-update: is idempotent", () => {
  assertEquals(translationUpdate.idempotent, true);
});
