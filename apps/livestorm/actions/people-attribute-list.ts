import type { ActionDefinition } from "@w6w/types";
import { compact, listQuery, LivestormClient } from "../lib/client.ts";
import type { JsonApiListResponse } from "../lib/client.ts";

/**
 * `GET /people_attributes` — the People Attribute slugs your workspace can use in a
 * registration or update's `fields` array (see `session-person-register`).
 */
interface Input {
  pageNumber?: number;
  pageSize?: number;
  sort?: string;
  builtin?: boolean;
  name?: string;
  slug?: string;
  type?: string;
}

const peopleAttributeList: ActionDefinition<Input> = {
  key: "people-attribute-list",
  type: "search",
  resource: "person",
  title: "List People Attributes",
  description:
    "List the People Attribute slugs (built-in and custom) your workspace can use when " +
    "registering or updating a session participant.",
  params: [
    { key: "pageNumber", label: "Page number", type: "number", hint: "0-indexed." },
    { key: "pageSize", label: "Page size", type: "number" },
    {
      key: "sort",
      label: "Sort",
      type: "string",
      hint: 'slug, name, placeholder, created_at, updated_at — prefix with "-" to reverse.',
    },
    { key: "builtin", label: "Filter: built-in only", type: "boolean" },
    { key: "name", label: "Filter: name", type: "string" },
    { key: "slug", label: "Filter: slug", type: "string" },
    {
      key: "type",
      label: "Filter: type",
      type: "select",
      options: [
        { label: "Text", value: "text" },
        { label: "Email", value: "email" },
        { label: "Avatar", value: "avatar" },
        { label: "URL", value: "url" },
        { label: "Consent", value: "consent" },
        { label: "Unique select", value: "unique_select" },
        { label: "Multiple select", value: "multiple_select" },
      ],
    },
  ],
  output: [
    { key: "data", type: "array", label: "People attributes" },
    { key: "meta", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    return await new LivestormClient(ctx).request<JsonApiListResponse>("/people_attributes", {
      query: {
        ...listQuery(input),
        ...compact({
          sort: input.sort,
          "filter[builtin]": input.builtin,
          "filter[name]": input.name,
          "filter[slug]": input.slug,
          "filter[type]": input.type,
        }),
      },
    });
  },
};

export default peopleAttributeList;
