import type { ActionDefinition } from "@w6w/types";
import { bareId, compact, LinkedInConversionsClient, sponsoredAccountUrn } from "../lib/client.ts";
import {
  accountIdParam,
  attributionTypeOptions,
  attributionWindowOptions,
  conversionIdParam,
} from "../lib/params.ts";

interface Input {
  conversionId: string;
  accountId: string;
  name?: string;
  enabled?: boolean;
  attributionType?: string;
  postClickAttributionWindowSize?: number;
  viewThroughAttributionWindowSize?: number;
}

/**
 * `POST /rest/conversions/{id}?account={sponsoredAccountUrn}`, header
 * `X-RestLi-Method: PARTIAL_UPDATE`, body `{ patch: { $set: {...} } }` — a
 * `$set` patch, so only the fields you set are changed.
 *
 * There is no documented way to delete a Conversion Rule outright (see
 * `lib/client.ts`); setting `enabled` to `false` here is the closest
 * equivalent LinkedIn documents — it stops the rule from matching new
 * conversions without deleting it or its event history.
 */
const conversionRuleUpdate: ActionDefinition<Input> = {
  key: "conversion-rule-update",
  type: "perform",
  resource: "conversion-rule",
  title: "Update Conversion Rule",
  description: "Partially update a Conversion Rule's name, enabled state or attribution " +
    "settings. Only the fields you set are changed. Set Enabled to false to stop new " +
    "conversions from matching this rule — LinkedIn documents no separate delete for a " +
    "Conversion Rule.",
  idempotent: true,
  params: [
    conversionIdParam,
    accountIdParam,
    { key: "name", label: "New name", type: "string" },
    { key: "enabled", label: "Enabled", type: "boolean" },
    {
      key: "attributionType",
      label: "Attribution model",
      type: "select",
      options: attributionTypeOptions,
    },
    {
      key: "postClickAttributionWindowSize",
      label: "Post-click attribution window (days)",
      type: "select",
      options: attributionWindowOptions,
    },
    {
      key: "viewThroughAttributionWindowSize",
      label: "View-through attribution window (days)",
      type: "select",
      options: attributionWindowOptions,
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Update accepted" }],

  async execute(input, ctx) {
    const set = compact({
      name: input.name,
      enabled: input.enabled,
      attributionType: input.attributionType,
      postClickAttributionWindowSize: input.postClickAttributionWindowSize,
      viewThroughAttributionWindowSize: input.viewThroughAttributionWindowSize,
    });
    if (Object.keys(set).length === 0) {
      throw new Error(
        "Set at least one of: name, enabled, attributionType, postClickAttributionWindowSize, " +
          "viewThroughAttributionWindowSize",
      );
    }

    const client = new LinkedInConversionsClient(ctx);
    await client.request(`/rest/conversions/${bareId(input.conversionId)}`, {
      method: "POST",
      restliMethod: "PARTIAL_UPDATE",
      query: { account: sponsoredAccountUrn(input.accountId) },
      body: { patch: { $set: set } },
    });
    return { ok: true };
  },
};

export default conversionRuleUpdate;
