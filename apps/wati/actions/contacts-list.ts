import type { ActionDefinition } from "@w6w/types";
import { WatiClient } from "../lib/client.ts";
import { PAGE_NUMBER_PARAM, PAGE_SIZE_PARAM } from "../lib/params.ts";

interface Input {
  pageNumber: number;
  pageSize: number;
}

interface ContactDto {
  id?: string;
  wa_id?: string;
  name?: string;
  phone?: string;
  contact_status?: string;
  opted_in?: boolean;
  allow_broadcast?: boolean;
  teams?: string[];
  custom_params?: Array<{ name: string; value: string }>;
}

interface GetContactListResponse {
  contact_list?: ContactDto[];
  page_number: number;
  page_size: number;
}

/**
 * `GET /api/ext/v3/contacts` — verified against the embedded OpenAPI document 2026-09-05.
 * `page_number` and `page_size` are both required by the operation's own schema (no default
 * page for "give me everything").
 */
const action: ActionDefinition<Input, GetContactListResponse> = {
  key: "contacts-list",
  type: "read",
  resource: "contacts",
  title: "List Contacts",
  description: "List contacts, paginated.",
  params: [PAGE_NUMBER_PARAM, PAGE_SIZE_PARAM],
  output: [
    { key: "contact_list", label: "Contacts", type: "array" },
    { key: "page_number", label: "Page Number", type: "number" },
    { key: "page_size", label: "Page Size", type: "number" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "listing Wati contacts", { pageNumber: input.pageNumber });
    return await new WatiClient(ctx).get<GetContactListResponse>("/contacts", {
      page_number: input.pageNumber,
      page_size: input.pageSize,
    });
  },
};

export default action;
