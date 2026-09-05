import { assertEquals, assertRejects } from "@std/assert";
import spaceTagCreate from "../../actions/space-tag-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("space-tag-create: POSTs /space/tag", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: 1, name: "VIP", colorCode: "#FF5733", emoji: "⭐" } },
  ]);
  await spaceTagCreate.execute(
    { name: "VIP", colorCode: "#FF5733", emoji: "⭐" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v2/space/tag");
  assertEquals(JSON.parse(calls[0].body!), { name: "VIP", colorCode: "#FF5733", emoji: "⭐" });
});

Deno.test("space-tag-create: an empty name is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await spaceTagCreate.execute({ name: "" }, ctx),
    Error,
    "Name is required",
  );
  assertEquals(calls.length, 0);
});
