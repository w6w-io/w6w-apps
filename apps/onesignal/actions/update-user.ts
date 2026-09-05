import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, OneSignalClient, resolveAppId } from "../lib/client.ts";
import { ALIAS_PARAMS, aliasPath } from "../lib/alias.ts";

interface Input {
  aliasLabel?: string;
  aliasId: string;
  tags?: unknown;
  language?: string;
  timezoneId?: string;
  deltas?: unknown;
}

/**
 * `PATCH /apps/{app_id}/users/by/{alias_label}/{alias_id}` — verified against
 * the OpenAPI document. `properties` replaces stable fields (tags, language,
 * timezone, …); `deltas` **increments** frequently-changing counters
 * (`session_count`, `session_time`, `amount_spent`, `purchases`) rather than
 * setting them, which is why they are exposed as a separate raw-JSON field
 * instead of being merged into `tags`.
 */
const updateUser: ActionDefinition<Input> = {
  key: "update-user",
  type: "perform",
  resource: "user",
  title: "Update User",
  description: "Set a user's tags/language/timezone, and optionally increment usage deltas.",
  idempotent: false,
  params: [
    ...ALIAS_PARAMS,
    {
      key: "tags",
      label: "Tags",
      type: "json",
      default: "",
      hint: 'Flat string key/value pairs, e.g. {"plan": "pro"}. Merges with existing tags; ' +
        "set a key to an empty string to delete it.",
    },
    { key: "language", label: "Language", type: "string", default: "", advanced: true },
    { key: "timezoneId", label: "Timezone", type: "string", default: "", advanced: true },
    {
      key: "deltas",
      label: "Deltas",
      type: "json",
      default: "",
      hint: 'Increments, not sets, e.g. {"session_count": 1}.',
      advanced: true,
    },
  ],
  output: [
    { key: "identity", type: "object", label: "Identity" },
    { key: "properties", type: "object", label: "Properties" },
  ],

  execute(input, ctx) {
    const appId = resolveAppId(ctx.connection);
    const body = compact({
      properties: compact({
        tags: asOptionalJson(input.tags, "tags"),
        language: input.language,
        timezone_id: input.timezoneId,
      }),
      deltas: asOptionalJson(input.deltas, "deltas"),
    });
    return new OneSignalClient(ctx).json(
      `/apps/${encodeURIComponent(appId)}/users${aliasPath(input.aliasLabel, input.aliasId)}`,
      { method: "PATCH", body },
    );
  },
};

export default updateUser;
