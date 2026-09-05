import type { ActionDefinition } from "@w6w/types";
import { JudgeMeClient } from "../lib/client.ts";

/**
 * `GET /settings` — Index.
 *
 * Returns a key-value object of store settings — the document's own example
 * shows `admin_email`, `autopublish`, `widget_star_color`,
 * `enable_review_pictures` among them, but the full key vocabulary is not
 * enumerated anywhere in the document. `settingKeys` narrows the response to
 * only the keys named, using the document's `setting_keys[]` exploded-array
 * query parameter.
 */
interface Input {
  settingKeys?: string[];
}

const listSettings: ActionDefinition<Input> = {
  key: "list-settings",
  type: "read",
  resource: "settings",
  title: "List Settings",
  description:
    "Read store settings values, optionally narrowed to specific keys. The vendor documents a " +
    "handful of example keys but not the full set.",
  params: [
    {
      key: "settingKeys",
      label: "Setting Keys",
      type: "array",
      item: { type: "string" },
      hint: "Leave blank to return every setting the store has.",
    },
  ],
  output: [
    { key: "settings", type: "object", label: "Setting key -> value" },
  ],

  async execute(input, ctx) {
    const body = await new JudgeMeClient(ctx).json<{ settings?: Record<string, unknown> }>(
      "/settings",
      input.settingKeys?.length ? { query: { "setting_keys[]": input.settingKeys } } : {},
    );
    return { settings: body?.settings ?? {} };
  },
};

export default listSettings;
