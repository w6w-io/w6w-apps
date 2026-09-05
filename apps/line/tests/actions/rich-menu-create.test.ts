import { assertEquals } from "@std/assert";
import richMenuCreate from "../../actions/rich-menu-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const RICH_MENU = {
  size: { width: 2500, height: 1686 },
  selected: false,
  name: "Nice rich menu",
  chatBarText: "Tap to open",
  areas: [
    {
      bounds: { x: 0, y: 0, width: 2500, height: 1686 },
      action: { type: "postback", data: "action=buy&itemid=123" },
    },
  ],
};

Deno.test("rich-menu-create: POSTs the rich menu object and returns its id", async () => {
  const { ctx, calls } = mockCtx([{ body: { richMenuId: "richmenu-abc" } }]);
  const out = await richMenuCreate.execute({ richMenu: RICH_MENU }, ctx) as { richMenuId: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/bot/richmenu");
  assertEquals(JSON.parse(calls[0].body!), RICH_MENU);
  assertEquals(out.richMenuId, "richmenu-abc");
});

Deno.test("rich-menu-create: accepts the rich menu object as a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: { richMenuId: "r1" } }]);
  await richMenuCreate.execute({ richMenu: JSON.stringify(RICH_MENU) }, ctx);
  assertEquals(JSON.parse(calls[0].body!), RICH_MENU);
});

Deno.test("rich-menu-create: is declared non-idempotent", () => {
  assertEquals(richMenuCreate.idempotent, false);
});
