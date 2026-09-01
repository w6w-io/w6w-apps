import { assertEquals } from "@std/assert";
import keyUpdate from "../../actions/key-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("key-update: PUTs only the fields supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { key_id: 1 } }]);
  await keyUpdate.execute({ projectId: "p1", keyId: 1, description: "New desc" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1/keys/1");
  assertEquals(JSON.parse(calls[0].body!), { description: "New desc" });
});

Deno.test("key-update: forwards platforms, tags and inline translations", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await keyUpdate.execute(
    {
      projectId: "p1",
      keyId: 1,
      platforms: ["web", "other"],
      tags: ["a", "b"],
      isPlural: true,
      translations: '[{"language_iso":"en","translation":"Hi"}]',
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    platforms: ["web", "other"],
    tags: ["a", "b"],
    is_plural: true,
    translations: [{ language_iso: "en", translation: "Hi" }],
  });
});

Deno.test("key-update: is idempotent", () => {
  assertEquals(keyUpdate.idempotent, true);
});
