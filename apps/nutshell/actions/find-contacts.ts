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
  accountId?: string | number;
  leadId?: string | number;
  tag?: string;
}

/**
 * `findContacts(query, orderBy, orderDirection, limit, page, stubResponses)`.
 *
 * Nutshell's docs frame this as "find contacts associated with a specified
 * account or lead" — `accountId`/`leadId` are the two query keys almost
 * every call to this method uses; `territory` (a territory id) is the
 * remaining documented key not exposed as a named param here.
 */
const findContacts: ActionDefinition<Input, { records: NutshellEntity[]; count: number }> = {
  key: "find-contacts",
  type: "search",
  resource: "contact",
  title: "Find Contacts",
  description: "Search Contacts (people) associated with an Account or a Lead, or by tag.",
  params: [
    { key: "accountId", label: "Account ID", type: "string" },
    { key: "leadId", label: "Lead ID", type: "string" },
    {
      key: "tag",
      label: "Tag",
      type: "string",
      hint: "Comma-separated tag names. A Contact matching ANY of them is returned.",
    },
    { ...ORDER_BY_PARAM, default: "id" },
    ORDER_DIRECTION_PARAM,
    LIMIT_PARAM,
    PAGE_PARAM,
    STUB_RESPONSES_PARAM,
  ],
  output: [
    { key: "records", type: "array", label: "Contacts" },
    { key: "count", type: "number", label: "Number of Contacts returned" },
  ],

  async execute(input, ctx) {
    const query: Record<string, unknown> = {
      ...(input.accountId ? { accountId: input.accountId } : {}),
      ...(input.leadId ? { leadId: input.leadId } : {}),
      ...(input.tag ? { tag: input.tag.split(",").map((t) => t.trim()).filter(Boolean) } : {}),
    };

    const records = await new NutshellClient(ctx).call<NutshellEntity[]>("findContacts", {
      query,
      ...findParams(input),
    });
    return { records, count: records.length };
  },
};

export default findContacts;
