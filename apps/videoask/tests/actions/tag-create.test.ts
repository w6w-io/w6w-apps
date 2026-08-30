import { assertEquals } from "@std/assert";
import tagCreate from "../../actions/tag-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tag-create: POSTs {title} to /tags", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { tag_id: "t1", title: "My tag" } }]);
  const out = await tagCreate.execute({ title: "My tag" }, ctx) as { tag_id: string };
  assertEquals(pathOf(calls[0].url), "/tags");
  assertEquals(JSON.parse(calls[0].body!), { title: "My tag" });
  assertEquals(out.tag_id, "t1");
});
