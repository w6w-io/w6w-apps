import { assertEquals } from "@std/assert";
import tagApply from "../../actions/tag-apply.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tag-apply: calls PUT /1/objects/tagByName as JSON, defaulting to Contact", async () => {
  const { ctx, calls } = mockCtx([{ body: { code: 0 } }]);
  await tagApply.execute({ ids: "2", tagNames: "Blue,Yellow" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/1/objects/tagByName");
  assertEquals(calls[0].headers["content-type"], "application/json");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.objectID, 0);
  assertEquals(body.ids, [2]);
  assertEquals(body.add_names, ["Blue", "Yellow"]);
});

Deno.test("tag-apply: honors a non-default object type ID", async () => {
  const { ctx, calls } = mockCtx([{ body: { code: 0 } }]);
  await tagApply.execute({ objectTypeId: 14, ids: "1,2", tagNames: "x" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.objectID, 14);
  assertEquals(body.ids, [1, 2]);
});
