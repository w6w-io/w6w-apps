import type { ActionDefinition } from "@w6w/types";
import { ClioClient, compact, idRef } from "../lib/client.ts";
import { fieldsParam, matterStatusOptions, refParam } from "../lib/params.ts";

/**
 * `POST /matters.json` — required: `client` and `description` (verified in the
 * OpenAPI document's `Matter` create schema).
 */
interface Input {
  clientId: number;
  description: string;
  status?: string;
  displayNumber?: string;
  practiceAreaId?: number;
  responsibleAttorneyId?: number;
  originatingAttorneyId?: number;
  billable?: boolean;
  openDate?: string;
  closeDate?: string;
  pendingDate?: string;
  fields?: string;
}

const matterCreate: ActionDefinition<Input> = {
  key: "matter-create",
  type: "perform",
  resource: "matter",
  title: "Create Matter",
  description: "Create a new matter for an existing client (contact).",
  idempotent: false,
  params: [
    { ...refParam("clientId", "Client (contact) ID"), required: true },
    {
      key: "description",
      label: "Description",
      type: "text",
      required: true,
      hint: "Detailed description of the matter.",
    },
    { key: "status", label: "Status", type: "select", options: matterStatusOptions },
    {
      key: "displayNumber",
      label: "Matter number",
      type: "string",
      hint: "Leave empty to let Clio assign one automatically, unless the account has manual " +
        "matter numbering enabled.",
    },
    refParam("practiceAreaId", "Practice area ID"),
    refParam("responsibleAttorneyId", "Responsible attorney (user) ID"),
    refParam("originatingAttorneyId", "Originating attorney (user) ID"),
    {
      key: "billable",
      label: "Billable",
      type: "boolean",
      default: true,
    },
    { key: "openDate", label: "Open date", type: "date" },
    { key: "closeDate", label: "Close date", type: "date" },
    { key: "pendingDate", label: "Pending date", type: "date" },
    fieldsParam("id,etag,display_number,description,status"),
  ],
  output: [{ key: "data", type: "object", label: "The created matter" }],

  execute(input, ctx) {
    return new ClioClient(ctx).data("/matters.json", {
      method: "POST",
      query: { fields: input.fields },
      body: compact({
        client: idRef(input.clientId),
        description: input.description,
        status: input.status,
        display_number: input.displayNumber,
        practice_area: idRef(input.practiceAreaId),
        responsible_attorney: idRef(input.responsibleAttorneyId),
        originating_attorney: idRef(input.originatingAttorneyId),
        billable: input.billable,
        open_date: input.openDate,
        close_date: input.closeDate,
        pending_date: input.pendingDate,
      }),
    });
  },
};

export default matterCreate;
