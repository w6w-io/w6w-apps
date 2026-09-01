import { assertEquals } from "@std/assert";
import keyGet from "../../actions/key-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("key-get: reads a key including translations by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { key_id: 331223, translations: [] } }]);
  const out = await keyGet.execute({ projectId: "p1", keyId: 331223 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1/keys/331223");
  assertEquals(queryOf(calls[0].url), { include_translations: "1" });
  assertEquals(out, { key_id: 331223, translations: [] });
});

Deno.test("key-get: can turn off translations and add comments/screenshots", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await keyGet.execute(
    {
      projectId: "p1",
      keyId: 1,
      includeTranslations: false,
      includeComments: true,
      includeScreenshots: true,
    },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {
    include_translations: "0",
    include_comments: "1",
    include_screenshots: "1",
  });
});
