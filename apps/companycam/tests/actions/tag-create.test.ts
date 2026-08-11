import { assertEquals } from "@std/assert";
import tagCreate from "../../actions/tag-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tag-create: nests display_value under tag", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "1", value: "front side" } }]);
  await tagCreate.execute({ displayValue: "Front Side" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/tags");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), { tag: { display_value: "Front Side" } });
  assertEquals(tagCreate.idempotent, false);
});
