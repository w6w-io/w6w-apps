import { assertEquals } from "@std/assert";
import languageList from "../../actions/language-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("language-list: lists a project's configured languages", async () => {
  const { ctx, calls } = mockCtx([{ body: { languages: [{ lang_iso: "en" }] } }]);
  const out = await languageList.execute({ projectId: "p1", limit: 50 }, ctx) as {
    items: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1/languages");
  assertEquals(queryOf(calls[0].url), { limit: "50" });
  assertEquals(out.items, [{ lang_iso: "en" }]);
});
