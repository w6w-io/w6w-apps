import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, GivebutterClient } from "../lib/client.ts";
import { numericIdParam } from "../lib/params.ts";

interface Setting {
  name: string;
  value?: unknown;
}

interface Input {
  id: string;
  published?: boolean;
  public?: boolean;
  type?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  goal?: number;
  end_at?: string;
  short_code?: string;
  slug?: string;
  beneficiary_id?: number;
  timezone?: string;
  currency?: string;
  default_appeal_id?: number;
  settings?: string | Setting[];
}

/** See `campaign-create.ts` for why `settings` is JSON rather than 50+ individual params. */
const campaignUpdate: ActionDefinition<Input> = {
  key: "campaign-update",
  type: "perform",
  resource: "campaign",
  title: "Update Campaign",
  description: "Update a campaign's fields. Only fields you set are changed.",
  idempotent: true,
  params: [
    numericIdParam("Campaign"),
    { key: "published", label: "Published", type: "boolean" },
    { key: "public", label: "Public", type: "boolean" },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "general", label: "General" },
        { value: "collect", label: "Collect" },
        { value: "fundraise", label: "Fundraise" },
        { value: "event", label: "Event" },
      ],
    },
    { key: "title", label: "Title", type: "string", validation: { maxLength: 150 } },
    { key: "subtitle", label: "Subtitle", type: "string", validation: { maxLength: 255 } },
    { key: "description", label: "Description", type: "text" },
    { key: "goal", label: "Goal (cents)", type: "number", validation: { integer: true, min: 0 } },
    { key: "end_at", label: "End at", type: "datetime" },
    { key: "short_code", label: "Short code", type: "string", validation: { maxLength: 255 } },
    { key: "slug", label: "Slug", type: "string", validation: { maxLength: 255 } },
    { key: "beneficiary_id", label: "Beneficiary ID", type: "number" },
    { key: "timezone", label: "Timezone", type: "string" },
    {
      key: "currency",
      label: "Currency",
      type: "select",
      options: [{ value: "USD", label: "USD" }],
    },
    { key: "default_appeal_id", label: "Default appeal ID", type: "number" },
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
    { key: "status", type: "string", label: "Status" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],

  async execute(input, ctx) {
    const body = compact({
      published: input.published,
      public: input.public,
      type: input.type,
      title: input.title,
      subtitle: input.subtitle,
      description: input.description,
      goal: input.goal,
      end_at: input.end_at,
      short_code: input.short_code,
      slug: input.slug,
      beneficiary_id: input.beneficiary_id,
      timezone: input.timezone,
      currency: input.currency,
      default_appeal_id: input.default_appeal_id,
      settings: asOptionalJson<Setting[]>(input.settings, "settings"),
    });
    return await new GivebutterClient(ctx).data(`/campaigns/${encodeURIComponent(input.id)}`, {
      method: "PUT",
      body,
    });
  },
};

export default campaignUpdate;
