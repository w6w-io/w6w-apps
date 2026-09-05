import { assertEquals } from "@std/assert";
import tagUpdate from "../../actions/tag-update.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tag-update: calls PUT /1/Tags, form-urlencoded", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ attrs: { tag_name: "updated_tag" } }) }]);
  await tagUpdate.execute({ id: "1", tagName: "updated_tag" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/1/Tags");
  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("id"), "1");
  assertEquals(form.get("tag_name"), "updated_tag");
});
