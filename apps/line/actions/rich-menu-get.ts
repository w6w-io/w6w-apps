import type { ActionDefinition } from "@w6w/types";
import { LineClient } from "../lib/client.ts";
import { richMenuIdParam } from "../lib/params.ts";

interface Input {
  richMenuId: string;
}

/** `GET /v2/bot/richmenu/{richMenuId}` — one rich menu's full definition. */
const richMenuGet: ActionDefinition<Input> = {
  key: "rich-menu-get",
  type: "read",
  resource: "rich-menu",
  title: "Get Rich Menu",
  description: "Get a rich menu's definition by ID.",
  params: [richMenuIdParam],
  output: [
    { key: "richMenuId", type: "string", label: "Rich menu ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "size", type: "object", label: "{ width, height }" },
    { key: "chatBarText", type: "string", label: "Chat bar text" },
    { key: "selected", type: "boolean", label: "Selected by default when shown" },
    { key: "areas", type: "array", label: "Tap-target areas" },
  ],

  execute(input, ctx) {
    const richMenuId = String(input.richMenuId ?? "").trim();
    if (!richMenuId) throw new Error("`richMenuId` is required");
    return new LineClient(ctx).json(`/v2/bot/richmenu/${encodeURIComponent(richMenuId)}`);
  },
};

export default richMenuGet;
