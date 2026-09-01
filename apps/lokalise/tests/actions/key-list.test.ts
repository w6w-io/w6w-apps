import { assertEquals } from "@std/assert";
import keyList from "../../actions/key-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("key-list: lists a project's keys with the default limit", async () => {
  const { ctx, calls } = mockCtx([{ body: { keys: [{ key_id: 1 }] } }]);
  const out = await keyList.execute({ projectId: "p1", limit: 100 }, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1/keys");
  assertEquals(queryOf(calls[0].url), { limit: "100" });
  assertEquals(out.items, [{ key_id: 1 }]);
});

Deno.test("key-list: forwards boolean includes and multiselect filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { keys: [] } }]);
  await keyList.execute(
    {
      projectId: "p1",
      includeTranslations: true,
      includeComments: false,
      filterPlatforms: ["ios", "web"],
      filterUntranslated: true,
    },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {
    include_translations: "1",
    include_comments: "0",
    filter_platforms: "ios,web",
    filter_untranslated: "1",
  });
});
