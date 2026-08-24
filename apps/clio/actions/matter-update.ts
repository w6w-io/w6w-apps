import type { ActionDefinition } from "@w6w/types";
import { ClioClient, compact, idRef } from "../lib/client.ts";
import { fieldsParam, idParam, matterStatusOptions, refParam } from "../lib/params.ts";

/** `PATCH /matters/{id}.json` — every body field is optional; only sent fields change. */
interface Input {
  id: number;
  description?: string;
  status?: string;
  clientId?: number;
  practiceAreaId?: number;
  responsibleAttorneyId?: number;
  billable?: boolean;
  closeDate?: string;
  fields?: string;
}

const matterUpdate: ActionDefinition<Input> = {
  key: "matter-update",
  type: "perform",
  resource: "matter",
  title: "Update Matter",
  description: "Update fields on an existing matter. Only the fields you set are changed.",
  idempotent: true,
  params: [
    idParam("Matter ID"),
    { key: "description", label: "Description", type: "text" },
    { key: "status", label: "Status", type: "select", options: matterStatusOptions },
    refParam("clientId", "Client (contact) ID"),
    refParam("practiceAreaId", "Practice area ID"),
    refParam("responsibleAttorneyId", "Responsible attorney (user) ID"),
    { key: "billable", label: "Billable", type: "boolean" },
    { key: "closeDate", label: "Close date", type: "date" },
    fieldsParam("id,etag,display_number,description,status"),
  ],
  output: [{ key: "data", type: "object", label: "The updated matter" }],

  execute(input, ctx) {
    return new ClioClient(ctx).data(`/matters/${input.id}.json`, {
      method: "PATCH",
      query: { fields: input.fields },
      body: compact({
        description: input.description,
        status: input.status,
        client: idRef(input.clientId),
        practice_area: idRef(input.practiceAreaId),
        responsible_attorney: idRef(input.responsibleAttorneyId),
        billable: input.billable,
        close_date: input.closeDate,
      }),
    });
  },
};

export default matterUpdate;
