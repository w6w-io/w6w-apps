import type { ActionDefinition } from "@w6w/types";
import {
  type FindInput,
  findParams,
  LIMIT_PARAM,
  NutshellClient,
  type NutshellEntity,
  ORDER_BY_PARAM,
  ORDER_DIRECTION_PARAM,
  PAGE_PARAM,
  STUB_RESPONSES_PARAM,
} from "../lib/client.ts";

interface Input extends FindInput {
  status?: number;
  accountId?: string | number;
  contactId?: string | number;
  milestoneId?: string | number;
  number?: number;
  query?: string;
}

/**
 * `findLeads(query, orderBy, orderDirection, limit, page, stubResponses)`.
 *
 * The named params here (`status`, `accountId`, `contactId`, `milestoneId`,
 * `number`) are the query keys documented on `Core::findLeads` most
 * workflows reach for; the rest of that method's query vocabulary (`filter`,
 * `outcomeId`, `milestoneIds`, `stagesetId`/`stagesetIds`, `dueTime`,
 * `assignee`, `origin`, `channel`, `source`, `tag`, `priority`) is available
 * via the raw JSON `query` escape hatch, merged over the named fields.
 * Nutshell documents that query keys are ANDed together and that a value
 * accepting multiples is ORed within itself.
 *
 * `number` finds the Lead by the number shown on the Nutshell website (e.g.
 * `1000` for "Lead-1000") — the identifier `getLead`'s `leadId` does NOT
 * accept.
 *
 * Nutshell caps `limit` at 100 for non-stub (`fullRecords: true`) responses,
 * and documents `find` calls with `stubResponses: false` as its main
 * rate-limiting target.
 */
const findLeads: ActionDefinition<Input, { records: NutshellEntity[]; count: number }> = {
  key: "find-leads",
  type: "search",
  resource: "lead",
  title: "Find Leads",
  description: "Search Leads by status, account, contact, milestone (stage) or website Lead " +
    "number, with an escape hatch for any other documented query key.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: 0, label: "Open" },
        { value: 1, label: "Pending" },
        { value: 10, label: "Won" },
        { value: 11, label: "Lost" },
        { value: 12, label: "Cancelled" },
      ],
    },
    { key: "accountId", label: "Account ID", type: "string" },
    { key: "contactId", label: "Contact ID", type: "string" },
    { key: "milestoneId", label: "Milestone (stage) ID", type: "string" },
    {
      key: "number",
      label: "Lead number",
      type: "number",
      hint: 'The number shown on the website, e.g. `1000` for "Lead-1000" — not the internal ID.',
    },
    {
      key: "query",
      label: "Additional query (JSON)",
      type: "json",
      hint: "Any other findLeads query keys, e.g. " +
        '`{"tag": ["hot"], "dueTime": "> 2026-01-01"}`. Merged over the fields above.',
      advanced: true,
    },
    { ...ORDER_BY_PARAM, default: "id" },
    ORDER_DIRECTION_PARAM,
    LIMIT_PARAM,
    PAGE_PARAM,
    STUB_RESPONSES_PARAM,
  ],
  output: [
    { key: "records", type: "array", label: "Leads" },
    { key: "count", type: "number", label: "Number of Leads returned" },
  ],

  async execute(input, ctx) {
    const extra = input.query
      ? (() => {
        try {
          return JSON.parse(input.query) as Record<string, unknown>;
        } catch {
          throw new Error(`Additional query is not valid JSON: ${input.query}`);
        }
      })()
      : {};
    const query: Record<string, unknown> = {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.accountId ? { accountId: input.accountId } : {}),
      ...(input.contactId ? { contactId: input.contactId } : {}),
      ...(input.milestoneId ? { milestoneId: input.milestoneId } : {}),
      ...(input.number !== undefined ? { number: input.number } : {}),
      ...extra,
    };

    const records = await new NutshellClient(ctx).call<NutshellEntity[]>("findLeads", {
      query,
      ...findParams(input),
    });
    return { records, count: records.length };
  },
};

export default findLeads;
