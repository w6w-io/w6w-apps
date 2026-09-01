import { assertEquals } from "@std/assert";
import { mockDripCtx } from "../_helpers.ts";
import action from "../../actions/list-tags.ts";

Deno.test("list-tags: GETs /tags and returns the flat string array", async () => {
  const { ctx, calls } = mockDripCtx([{ body: { tags: ["Customer", "SEO"] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.getdrip.com/v2/1234567/tags");
  assertEquals(out, { tags: ["Customer", "SEO"] });
});

Deno.test("list-tags: defaults to an empty array", async () => {
  const { ctx } = mockDripCtx([{ body: {} }]);
  assertEquals(await action.execute({}, ctx), { tags: [] });
});
