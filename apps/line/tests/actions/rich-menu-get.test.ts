import { assertEquals, assertRejects } from "@std/assert";
import richMenuGet from "../../actions/rich-menu-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("rich-menu-get: GETs /v2/bot/richmenu/{richMenuId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { richMenuId: "r1", name: "Nice rich menu" } }]);
  const out = await richMenuGet.execute({ richMenuId: "r1" }, ctx) as { name: string };

  assertEquals(pathOf(calls[0].url), "/v2/bot/richmenu/r1");
  assertEquals(out.name, "Nice rich menu");
});

Deno.test("rich-menu-get: a non-existent rich menu surfaces LINE's 404", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Not found" } }]);
  await assertRejects(
    async () => await richMenuGet.execute({ richMenuId: "gone" }, ctx),
    Error,
    "Not found",
  );
});

Deno.test("rich-menu-get: requires richMenuId", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await richMenuGet.execute({ richMenuId: "" }, ctx),
    Error,
    "richMenuId",
  );
  assertEquals(calls.length, 0);
});
