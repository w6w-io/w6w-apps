import type { ActionDefinition } from "@w6w/types";
import { asJson, LineClient } from "../lib/client.ts";

interface Input {
  richMenu: unknown;
}

/**
 * `POST /v2/bot/richmenu` — define a rich menu (the tappable menu bar under a LINE Official
 * Account's chat screen).
 *
 * Creating one is step one of three: it exists but is invisible until you also
 * `rich-menu-image-upload` an image to it, then either `rich-menu-set-default` (shown to everyone)
 * or `rich-menu-link-to-user` (shown to one person). The rich menu object's shape — `size`,
 * `selected`, `name`, `chatBarText`, `areas[].{bounds, action}` — is accepted as free-form JSON
 * rather than re-modelled field by field, both because `areas[].action` reuses LINE's whole action
 * object union (the same one Postback/Message/URI/richmenuswitch actions use everywhere else in
 * this API) and because getting the tap-target bounds right is inherently a visual, pixel-coordinate
 * task no form field replaces. See
 * https://developers.line.biz/en/reference/messaging-api/#rich-menu-object.
 */
const richMenuCreate: ActionDefinition<Input> = {
  key: "rich-menu-create",
  type: "perform",
  resource: "rich-menu",
  title: "Create Rich Menu",
  description: "Define a rich menu object. Upload an image and set it default/linked to show it.",
  idempotent: false,
  params: [
    {
      key: "richMenu",
      label: "Rich menu object",
      type: "json",
      required: true,
      hint: "{ size: {width, height}, selected, name, chatBarText, areas: [{ bounds: {x, y, " +
        "width, height}, action }] }. See " +
        "https://developers.line.biz/en/reference/messaging-api/#rich-menu-object",
    },
  ],
  output: [
    { key: "richMenuId", type: "string", label: "Rich menu ID" },
  ],

  execute(input, ctx) {
    const richMenu = asJson<Record<string, unknown>>(input.richMenu, "richMenu");
    ctx.log("info", "creating a LINE rich menu", { name: (richMenu as { name?: string }).name });
    return new LineClient(ctx).json("/v2/bot/richmenu", { method: "POST", body: richMenu });
  },
};

export default richMenuCreate;
