import { assertEquals, assertRejects } from "@std/assert";
import spaceTagDelete from "../../actions/space-tag-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("space-tag-delete: DELETEs /space/tag with {name}", async () => {
  const { ctx, calls } = mockCtx([{ body: { code: 200, message: "deleted" } }]);
  await spaceTagDelete.execute({ name: "Old Tag" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/space/tag");
  assertEquals(JSON.parse(calls[0].body!), { name: "Old Tag" });
});

Deno.test("space-tag-delete: an empty name is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await spaceTagDelete.execute({ name: "" }, ctx),
    Error,
    "Name is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("space-tag-delete: is declared idempotent", () => {
  assertEquals(spaceTagDelete.idempotent, true);
});
