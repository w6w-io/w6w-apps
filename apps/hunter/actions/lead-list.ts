import type { ActionDefinition } from "@w6w/types";
import { compact, HunterClient } from "../lib/client.ts";
import { toArray } from "../lib/list.ts";
import { leadSyncStatusOptions, leadVerificationStatusOptions } from "../lib/params.ts";

/**
 * `GET /v2/leads` — list saved leads, most recent first. Free.
 *
 * Hunter's full filter surface is large (30+ params, many Beta: department[],
 * tags[], campaign_ids[], confidence-score and date-range filters). This
 * action covers the commonly-used identity and status filters; the wider
 * Beta filter set is left out rather than guessed at, since Beta parameters
 * may still change shape.
 *
 * `verification_status` here is a DIFFERENT vocabulary from Domain Search's
 * same-named filter — see `lib/params.ts`'s file-level note.
 */
interface Input {
  leadsListId?: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  query?: string;
  syncStatus?: string;
  verificationStatus?: string[] | string;
  limit?: number;
  offset?: number;
}

const leadList: ActionDefinition<Input> = {
  key: "lead-list",
  type: "search",
  resource: "lead",
  title: "List Leads",
  description: "List saved leads, most recent first. Free.",
  params: [
    { key: "leadsListId", label: "Leads list ID", type: "number" },
    { key: "email", label: "Email contains", type: "string" },
    { key: "firstName", label: "First name contains", type: "string" },
    { key: "lastName", label: "Last name contains", type: "string" },
    { key: "company", label: "Company contains", type: "string" },
    {
      key: "query",
      label: "Search query",
      type: "string",
      hint: "Matches first_name, last_name or email.",
    },
    {
      key: "syncStatus",
      label: "Sync status",
      type: "select",
      options: leadSyncStatusOptions,
    },
    {
      key: "verificationStatus",
      label: "Verification status",
      type: "multiselect",
      options: leadVerificationStatusOptions,
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 20,
      hint: "1–1,000. Default 20.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      default: 0,
      hint: "0–100,000.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "leads[]" },
    { key: "meta", type: "object", label: "total, params echo" },
  ],

  execute(input, ctx) {
    return new HunterClient(ctx).request("/leads", {
      query: compact({
        leads_list_id: input.leadsListId,
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        company: input.company,
        query: input.query,
        sync_status: input.syncStatus,
        limit: input.limit,
        offset: input.offset,
      }),
      arrayQuery: { verification_status: toArray(input.verificationStatus) },
    });
  },
};

export default leadList;
