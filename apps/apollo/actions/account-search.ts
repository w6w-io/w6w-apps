import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, type ApolloPagination, compact } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `POST /accounts/search` — search the accounts already saved in your team's Apollo
 * instance. This is a JSON-body endpoint (unlike the `people-search`/`organization-search`
 * database searches, which take query parameters — see `lib/client.ts`'s module doc).
 */
interface Input {
  q_organization_name?: string;
  account_stage_ids?: string[] | string;
  account_label_ids?: string[] | string;
  sort_by_field?: string;
  sort_ascending?: boolean;
  page?: number;
  per_page?: number;
}

function toArr(v: string[] | string | undefined): string[] | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v : v.split(",").map((s) => s.trim()).filter(Boolean);
}

const accountSearch: ActionDefinition<Input> = {
  key: "account-search",
  type: "search",
  resource: "account",
  title: "Search Accounts",
  description: "Search the accounts already saved in your team's Apollo instance.",
  params: [
    { key: "q_organization_name", label: "Keywords", type: "string" },
    {
      key: "account_stage_ids",
      label: "Account stage IDs",
      type: "string",
      hint: "Comma-separated. From `account-stage-list`.",
    },
    {
      key: "account_label_ids",
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
        { value: "account_last_activity_date", label: "Last activity" },
        { value: "account_created_at", label: "Created at" },
        { value: "account_updated_at", label: "Updated at" },
      ],
    },
    { key: "sort_ascending", label: "Ascending", type: "boolean", advanced: true },
    ...paginationParams(25),
  ],
  output: [
    { key: "accounts", type: "array", label: "Matching accounts" },
    { key: "pagination", type: "object", label: "page, per_page, total_entries, total_pages" },
  ],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).post<
      { accounts?: unknown[]; pagination?: ApolloPagination }
    >("/accounts/search", {
      body: compact({
        q_organization_name: input.q_organization_name,
        account_stage_ids: toArr(input.account_stage_ids),
        account_label_ids: toArr(input.account_label_ids),
        sort_by_field: input.sort_by_field,
        sort_ascending: input.sort_ascending,
        page: input.page,
        per_page: input.per_page,
      }),
    });
    return { accounts: body.accounts ?? [], pagination: body.pagination ?? {} };
  },
};

export default accountSearch;
