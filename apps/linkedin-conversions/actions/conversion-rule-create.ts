import type { ActionDefinition } from "@w6w/types";
import { compact, LinkedInConversionsClient, sponsoredAccountUrn } from "../lib/client.ts";
import {
  accountIdParam,
  attributionTypeOptions,
  attributionWindowOptions,
  autoAssociationTypeOptions,
  conversionTypeOptions,
  valueTypeOptions,
} from "../lib/params.ts";

interface Input {
  accountId: string;
  name: string;
  type: string;
  enabled?: boolean;
  attributionType?: string;
  postClickAttributionWindowSize?: number;
  viewThroughAttributionWindowSize?: number;
  valueType?: string;
  autoAssociationType?: string;
}

/**
 * `POST /rest/conversions` — a plain single create. `conversionMethod` is
 * pinned to `"CONVERSIONS_API"` rather than exposed as a choice: the schema
 * docs state "For streaming conversions via API, the only supported value
 * is CONVERSIONS_API" (the alternative, unpinned value drives the separate,
 * Insight-Tag-based conversion tracking this app doesn't cover — see
 * README).
 *
 * `autoAssociationType`, if set, associates campaigns automatically at
 * creation time (up to 200 `ACTIVE`/`PAUSED`/`DRAFT` campaigns for
 * `ALL_CAMPAIGNS`, or every campaign whose objective maps to this rule's
 * `type` for `OBJECTIVE_BASED`, no cap). Leaving it unset associates none —
 * use `campaign-conversion-associate` to attach specific campaigns instead.
 *
 * The new rule's numeric id comes back in both the response body's `id`
 * field and the `x-restli-id` header; `request()` prefers the body when
 * present.
 */
const conversionRuleCreate: ActionDefinition<Input> = {
  key: "conversion-rule-create",
  type: "perform",
  resource: "conversion-rule",
  title: "Create Conversion Rule",
  description: "Create a Conversion Rule for streaming server-side conversion events via the " +
    "Conversions API.",
  idempotent: false,
  params: [
    accountIdParam,
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      hint: "Shown in the LinkedIn UI and in reports.",
    },
    {
      key: "type",
      label: "Conversion type",
      type: "select",
      required: true,
      options: conversionTypeOptions,
    },
    { key: "enabled", label: "Enabled", type: "boolean", default: true },
    {
      key: "attributionType",
      label: "Attribution model",
      type: "select",
      default: "LAST_TOUCH_BY_CAMPAIGN",
      options: attributionTypeOptions,
    },
    {
      key: "postClickAttributionWindowSize",
      label: "Post-click attribution window (days)",
      type: "select",
      default: 30,
      options: attributionWindowOptions,
      hint: "365 days is only valid for LEAD, PURCHASE, ADD_TO_CART, QUALIFIED_LEAD and " +
        "SUBMIT_APPLICATION types — not validated client-side.",
    },
    {
      key: "viewThroughAttributionWindowSize",
      label: "View-through attribution window (days)",
      type: "select",
      default: 7,
      options: attributionWindowOptions,
    },
    {
      key: "valueType",
      label: "Value type",
      type: "select",
      default: "DYNAMIC",
      options: valueTypeOptions,
      advanced: true,
    },
    {
      key: "autoAssociationType",
      label: "Auto-associate campaigns",
      type: "select",
      options: autoAssociationTypeOptions,
      hint: "Leave empty to associate no campaigns automatically.",
      advanced: true,
    },
  ],
  output: [{ key: "id", type: "string", label: "Conversion Rule ID" }],

  async execute(input, ctx) {
    const client = new LinkedInConversionsClient(ctx);
    const result = await client.request<{ id: string }>("/rest/conversions", {
      method: "POST",
      query: { autoAssociationType: input.autoAssociationType },
      body: {
        account: sponsoredAccountUrn(input.accountId),
        name: input.name,
        conversionMethod: "CONVERSIONS_API",
        type: input.type,
        ...compact({
          enabled: input.enabled,
          attributionType: input.attributionType,
          postClickAttributionWindowSize: input.postClickAttributionWindowSize,
          viewThroughAttributionWindowSize: input.viewThroughAttributionWindowSize,
          valueType: input.valueType,
        }),
      },
    });
    return { id: String(result.id) };
  },
};

export default conversionRuleCreate;
