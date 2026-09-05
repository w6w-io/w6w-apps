import { assertEquals, assertRejects } from "@std/assert";
import richMenuSetDefault from "../../actions/rich-menu-set-default.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("rich-menu-set-default: POSTs to /v2/bot/user/all/richmenu/{richMenuId}", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await richMenuSetDefault.execute({ richMenuId: "r1" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/bot/user/all/richmenu/r1");
  assertEquals(calls[0].body, null);
});

Deno.test("rich-menu-set-default: requires richMenuId", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await richMenuSetDefault.execute({ richMenuId: "" }, ctx),
    Error,
    "richMenuId",
  );
  assertEquals(calls.length, 0);
});

Deno.test("rich-menu-set-default: is declared idempotent", () => {
  assertEquals(richMenuSetDefault.idempotent, true);
});
