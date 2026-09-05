import { assertEquals, assertRejects } from "@std/assert";
import spaceTagUpdate from "../../actions/space-tag-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("space-tag-update: PUTs /space/tag, addressed by currentName", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "Premium Customer" } }]);
  await spaceTagUpdate.execute(
    { currentName: "VIP Customer", name: "Premium Customer", colorCode: "#FFD700" },
    ctx,
  );

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/space/tag");
  assertEquals(JSON.parse(calls[0].body!), {
    currentName: "VIP Customer",
    name: "Premium Customer",
    colorCode: "#FFD700",
  });
});

Deno.test("space-tag-update: an empty currentName is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await spaceTagUpdate.execute({ currentName: "" }, ctx),
    Error,
    "Current name is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("space-tag-update: is declared idempotent", () => {
  assertEquals(spaceTagUpdate.idempotent, true);
});
