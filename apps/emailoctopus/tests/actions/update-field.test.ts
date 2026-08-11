import { assert, assertEquals } from "@std/assert";
import action from "../../actions/update-field.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("update-field: addresses the field by its CURRENT tag and renames via the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { tag: "NewTag" } }]);
  await action.execute!({
    listId: "l1",
    currentTag: "OldTag",
    label: "Label",
    tag: "NewTag",
    type: "text",
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/lists/l1/fields/OldTag");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { label: "Label", tag: "NewTag", type: "text" });
});

Deno.test("update-field: percent-encodes a tag containing a space or slash", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    listId: "l1",
    currentTag: "First Name/Alias",
    label: "L",
    tag: "T",
    type: "text",
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/lists/l1/fields/First%20Name%2FAlias");
});

Deno.test("update-field: exposes no `choices` param — v2 does not document one on update", () => {
  const keys = action.params!.map((p) => p.key);
  assert(!keys.includes("choices"), "the PUT request schema is the text|number|date variant only");
  const typeParam = action.params!.find((p) => p.key === "type")!;
  assertEquals((typeParam.options as Array<{ value: string }>).map((o) => o.value), [
    "text",
    "number",
    "date",
  ]);
});
