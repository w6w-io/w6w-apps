import { compact, toPersonFields } from "./client.ts";
import type { PersonField } from "./client.ts";

/**
 * The registration/update attribute set shared by `POST /sessions/{id}/people`,
 * `PATCH /sessions/{period_id}/people/{id}` and each task of
 * `POST /sessions/{id}/people/bulk`.
 *
 * `fields` is the dynamic `{id, value}[]` shape People Attributes actually use — see
 * `lib/client.ts`'s module doc. `email`/`first_name`/`last_name` are NOT top-level attributes;
 * pass them as entries in `fields` (e.g. `{id: "email", value: "..."}`), using the slugs
 * `people-attribute-list` (`GET /people_attributes`) lists for your workspace.
 */
export interface PersonAttributesInput {
  fields?: PersonField[] | Record<string, string>;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmTerm?: string;
  utmContent?: string;
  utmCampaign?: string;
}

export const PERSON_FIELDS_PARAM = {
  key: "fields",
  label: "Fields",
  type: "array" as const,
  item: {
    type: "object" as const,
    fields: [
      {
        key: "id",
        label: "Attribute slug",
        type: "string" as const,
        required: true,
        hint: 'People Attribute slug, e.g. "email", "first_name", "last_name", or a custom one.',
      },
      { key: "value", label: "Value", type: "string" as const, required: true },
    ],
  },
  hint: "Built-in and custom People Attributes as {id, value} pairs — see GET /people_attributes.",
};

export const PERSON_ATTRIBUTE_PARAMS = [
  PERSON_FIELDS_PARAM,
  { key: "referrer", label: "Referrer", type: "string" as const },
  { key: "utmSource", label: "utm_source", type: "string" as const },
  { key: "utmMedium", label: "utm_medium", type: "string" as const },
  { key: "utmTerm", label: "utm_term", type: "string" as const },
  { key: "utmContent", label: "utm_content", type: "string" as const },
  { key: "utmCampaign", label: "utm_campaign", type: "string" as const },
];

export function personAttributes(input: PersonAttributesInput): Record<string, unknown> {
  return compact({
    fields: toPersonFields(input.fields),
    referrer: input.referrer,
    utm_source: input.utmSource,
    utm_medium: input.utmMedium,
    utm_term: input.utmTerm,
    utm_content: input.utmContent,
    utm_campaign: input.utmCampaign,
  });
}
