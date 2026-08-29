import { assertEquals } from "@std/assert";
import tagCreate from "../../actions/tag-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tag-create: posts the name and returns the auto-generated slug", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { slug: "marketing", name: "Marketing", created_at: "2026-01-15T10:30:00Z" },
  }]);
  const out = await tagCreate.execute(
    { socialSetId: 4, name: "Marketing" },
    ctx,
  ) as { slug: string };
  assertEquals(pathOf(calls[0].url), "/v2/social-sets/4/tags");
  assertEquals(JSON.parse(calls[0].body!), { name: "Marketing" });
  assertEquals(out.slug, "marketing");
});

Deno.test("tag-create: is not idempotent", () => {
  assertEquals(tagCreate.idempotent, false);
});
