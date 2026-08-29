import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, type ApolloPagination, compact } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `POST /contacts/search` — search the contacts already saved in your team's Apollo
 * instance. This is a JSON-body endpoint (unlike the `people-search` database search,
 * which takes query parameters — see `lib/client.ts`'s module doc).
 */
interface Input {
  q_keywords?: string;
  contact_stage_ids?: string[] | string;
  contact_label_ids?: string[] | string;
  sort_by_field?: string;
  sort_ascending?: boolean;
  page?: number;
  per_page?: number;
}

function toArr(v: string[] | string | undefined): string[] | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v : v.split(",").map((s) => s.trim()).filter(Boolean);
}

const contactSearch: ActionDefinition<Input> = {
  key: "contact-search",
  type: "search",
  resource: "contact",
  title: "Search Contacts",
  description: "Search the contacts already saved in your team's Apollo instance.",
  params: [
    {
      key: "q_keywords",
      label: "Keywords",
      type: "string",
      hint: "Names, job titles, employers, company names, or email addresses.",
    },
    {
      key: "contact_stage_ids",
      label: "Contact stage IDs",
      type: "string",
      hint: "Comma-separated. From `contact-stage-list`.",
    },
    {
      key: "contact_label_ids",
      label: "List (label) IDs",
      type: "string",
      advanced: true,
      hint: "Comma-separated. From `list-list`.",
    },
    {
      key: "sort_by_field",
      label: "Sort by",
      type: "select",
      advanced: true,
      options: [
        { value: "contact_last_activity_date", label: "Last activity" },
        { value: "contact_email_last_opened_at", label: "Email last opened" },
        { value: "contact_email_last_clicked_at", label: "Email last clicked" },
        { value: "contact_created_at", label: "Created at" },
        { value: "contact_updated_at", label: "Updated at" },
      ],
    },
    { key: "sort_ascending", label: "Ascending", type: "boolean", advanced: true },
    ...paginationParams(25),
  ],
  output: [
    { key: "contacts", type: "array", label: "Matching contacts" },
    { key: "pagination", type: "object", label: "page, per_page, total_entries, total_pages" },
  ],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).post<
      { contacts?: unknown[]; pagination?: ApolloPagination }
    >("/contacts/search", {
      body: compact({
        q_keywords: input.q_keywords,
        contact_stage_ids: toArr(input.contact_stage_ids),
        contact_label_ids: toArr(input.contact_label_ids),
        sort_by_field: input.sort_by_field,
        sort_ascending: input.sort_ascending,
        page: input.page,
        per_page: input.per_page,
      }),
    });
    return { contacts: body.contacts ?? [], pagination: body.pagination ?? {} };
  },
};

export default contactSearch;
