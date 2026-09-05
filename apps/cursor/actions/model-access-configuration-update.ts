import type { ActionDefinition } from "@w6w/types";
import { CursorClient } from "../lib/client.ts";

interface Input {
  state?: "unrestricted";
  newProviderDefault?: "enabled" | "disabled";
  newModelDefault?: "enabled" | "disabled";
}

/**
 * `PUT /teams/model-access/configuration` — two documented, mutually
 * exclusive shapes, not one:
 *
 *  - `{"state": "unrestricted"}` clears any custom policy (and legacy
 *    allowed/blocked lists) so the team is unrestricted again.
 *  - `{"newProviderDefault", "newModelDefault"}` creates or updates a custom
 *    policy — backward-compatible shorthand for `state: "custom"`.
 *
 * The FIRST defaults PUT on an unrestricted team turns policy on and seeds
 * the current catalog (same effect as the first save on the dashboard's
 * Models page); later defaults PUTs update only the defaults and leave
 * existing per-provider/per-model toggles in place. Writes need the
 * `models:*` scope (or `admin:*`) and appear in team audit logs.
 */
const modelAccessConfigurationUpdate: ActionDefinition<Input> = {
  key: "model-access-configuration-update",
  type: "perform",
  resource: "model-access",
  title: "Update Model Access Configuration",
  description: "Create a custom model-access policy, update its defaults, or return the team to " +
    "unrestricted. Preview route.",
  idempotent: true,
  params: [
    {
      key: "state",
      label: "Return to unrestricted",
      type: "select",
      options: [{ value: "unrestricted", label: "unrestricted" }],
      hint: "Set to unrestricted to clear the custom policy. Leave empty when sending defaults " +
        "below instead.",
    },
    {
      key: "newProviderDefault",
      label: "Default for new providers",
      type: "select",
      options: [
        { value: "enabled", label: "enabled" },
        { value: "disabled", label: "disabled" },
      ],
    },
    {
      key: "newModelDefault",
      label: "Default for new models",
      type: "select",
      options: [
        { value: "enabled", label: "enabled" },
        { value: "disabled", label: "disabled" },
      ],
    },
  ],
  output: [
    { key: "teamId", type: "number", label: "Team id" },
    { key: "state", type: "string", label: "unrestricted | legacy | custom" },
    { key: "newProviderDefault", type: "string", label: "Default applied to a new provider" },
    { key: "newModelDefault", type: "string", label: "Default applied to a new model" },
  ],

  execute(input, ctx) {
    if (input.state === "unrestricted") {
      return new CursorClient(ctx).put("/teams/model-access/configuration", {
        state: "unrestricted",
      });
    }
    if (!input.newProviderDefault && !input.newModelDefault) {
      throw new Error(
        'set state to "unrestricted", or provide newProviderDefault / newModelDefault',
      );
    }
    return new CursorClient(ctx).put("/teams/model-access/configuration", {
      newProviderDefault: input.newProviderDefault,
      newModelDefault: input.newModelDefault,
    });
  },
};

export default modelAccessConfigurationUpdate;
