import type { ActionDefinition } from "@w6w/types";
import { LineClient } from "../lib/client.ts";

/**
 * `GET /v2/bot/richmenu/list` — every rich menu created through this API.
 *
 * LINE's own note: rich menus created through LINE Official Account Manager (rather than this API)
 * are not returned here.
 */
const richMenuList: ActionDefinition = {
  key: "rich-menu-list",
  type: "search",
  resource: "rich-menu",
  title: "List Rich Menus",
  description:
    "List rich menus created through the Messaging API (not via Official Account Manager).",
  output: [
    { key: "richmenus", type: "array", label: "Rich menu objects" },
  ],

  async execute(_input, ctx) {
    const body = await new LineClient(ctx).json<{ richmenus?: unknown[] }>("/v2/bot/richmenu/list");
    return { richmenus: body?.richmenus ?? [] };
  },
};

export default richMenuList;
