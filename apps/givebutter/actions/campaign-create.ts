import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, GivebutterClient } from "../lib/client.ts";

interface Setting {
  name: string;
  value?: unknown;
}

interface Input {
  type: string;
  title: string;
  subtitle?: string;
  description?: string;
  goal?: number;
  end_at?: string;
  slug?: string;
  beneficiary_id?: number;
  timezone?: string;
  currency?: string;
  settings?: string | Setting[];
}

/**
 * `settings` accepts an array of `{name, value}` objects, where `name` is one
 * of over 50 documented flags (`hide_time_remaining`, `theme_color`,
 * `disable_recurring`, `default_fund`, `require_ticket_phone`, ...) and the
 * shape of `value` depends on which `name` was given (a boolean for most, a
 * `#rrggbb` string for `theme_color`, an id for `default_fund`). Exposing each
 * as its own param would mean 50+ fields on one form for a feature most
 * campaigns never touch, so this app takes the whole array as JSON instead —
 * see Givebutter's Campaigns docs for the full `name`/`value` matrix.
 */
const campaignCreate: ActionDefinition<Input> = {
  key: "campaign-create",
  type: "perform",
  resource: "campaign",
  title: "Create Campaign",
  description: "Create a new campaign.",
  idempotent: false,
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [
        { value: "general", label: "General" },
        { value: "collect", label: "Collect" },
        { value: "fundraise", label: "Fundraise" },
        { value: "event", label: "Event" },
      ],
    },
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      validation: { maxLength: 150 },
    },
    { key: "subtitle", label: "Subtitle", type: "string", validation: { maxLength: 255 } },
    { key: "description", label: "Description", type: "text" },
    { key: "goal", label: "Goal (cents)", type: "number", validation: { integer: true, min: 0 } },
    {
      key: "end_at",
      label: "End at",
      type: "datetime",
      hint: "ISO 8601 date-time. Leave empty for a campaign with no end date.",
    },
    {
      key: "slug",
      label: "Slug",
      type: "string",
      required: true,
      validation: { maxLength: 255 },
      hint: "The campaign's URL slug — the last path segment of its public URL.",
    },
    { key: "beneficiary_id", label: "Beneficiary ID", type: "number" },
    {
      key: "timezone",
      label: "Timezone",
      type: "string",
      hint: "IANA timezone, e.g. America/New_York.",
    },
    {
      key: "currency",
      label: "Currency",
      type: "select",
      options: [{ value: "USD", label: "USD" }],
      default: "USD",
      hint: "Givebutter's API currently documents USD as the only accepted value.",
    },
    {
      key: "settings",
      label: "Settings",
      type: "json",
      hint:
        'Array of {"name": "...", "value": ...} objects. See Givebutter\'s Campaigns API docs ' +
        "for the full list of setting names and their value shapes.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Campaign ID" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "url", type: "string", label: "Public URL" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const body = compact({
      type: input.type,
      title: input.title,
      subtitle: input.subtitle,
      description: input.description,
      goal: input.goal,
      end_at: input.end_at,
      slug: input.slug,
      beneficiary_id: input.beneficiary_id,
      timezone: input.timezone,
      currency: input.currency,
      settings: asOptionalJson<Setting[]>(input.settings, "settings"),
    });
    return await new GivebutterClient(ctx).data("/campaigns", { method: "POST", body });
  },
};

export default campaignCreate;
