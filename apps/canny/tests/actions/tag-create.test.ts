import { assertEquals } from "@std/assert";
import tagCreate from "../../actions/tag-create.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("tag-create: posts boardID and name", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1", name: "bug" } }]);
  const out = await tagCreate.execute({ boardID: "b1", name: "bug" }, ctx) as { name: string };

  assertEquals(calls[0].url, "https://canny.io/api/v1/tags/create");
  assertEquals(bodyOf(calls[0]), { boardID: "b1", name: "bug" });
  assertEquals(out.name, "bug");
});

Deno.test("tag-create: is idempotent — Canny's own docs say 'created or already exists'", () => {
  assertEquals(tagCreate.idempotent, true);
});
