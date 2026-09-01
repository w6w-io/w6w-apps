import { assertEquals } from "@std/assert";
import translationGet from "../../actions/translation-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("translation-get: reads a translation by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { translation_id: 444921, translation: "Welcome" } }]);
  const out = await translationGet.execute({ projectId: "p1", translationId: 444921 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1/translations/444921");
  assertEquals(out, { translation_id: 444921, translation: "Welcome" });
});
