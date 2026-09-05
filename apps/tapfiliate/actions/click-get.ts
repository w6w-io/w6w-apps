import type { ActionDefinition } from "@w6w/types";
import { encodeId, TapfiliateClient } from "../lib/client.ts";

/**
 * `GET /clicks/{id}/` — "available only for the clients of Enterprise plan" per the docs.
 */
interface Input {
  id: string;
}

const clickGet: ActionDefinition<Input> = {
  key: "click-get",
  type: "read",
  resource: "click",
  title: "Get Click Details",
  description:
    "Fetch detailed information about a click, including device/browser and geolocation. Enterprise plan only.",
  params: [{ key: "id", label: "Click", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Click id" },
    { key: "details", type: "object", label: "OS, browser, platform, landing page" },
    { key: "geolocation", type: "object", label: "Country" },
    { key: "affiliate", type: "object", label: "The referring affiliate" },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).json(`/clicks/${encodeId(input.id)}/`);
  },
};

export default clickGet;
