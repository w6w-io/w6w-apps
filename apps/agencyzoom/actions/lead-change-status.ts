import type { ActionDefinition } from "@w6w/types";
import { AgencyZoomClient, compact, type GenericSuccessResponse } from "../lib/client.ts";
import { leadChangeStatusOptions } from "../lib/params.ts";

/**
 * `PUT /v1/api/leads/{leadId}/status` — move a lead to Active, Won, Lost or
 * X-Dated.
 *
 * The vendor's enum here is `{0, 2, 3, 5}` — narrower than the six values
 * `Lead.status` can hold (`leadStatusOptions`). "Contacted" (4) and "Quoted"
 * (1) are reached by dedicated flows this app does not (yet) cover — passing
 * either here is rejected by the API, not a shorthand for those states. See
 * `lib/params.ts`.
 */
interface Input {
  leadId: number;
  status: number;
  date?: string;
  lossReasonId?: number;
  xDateType?: string;
  changeLeadSourceTo?: number;
  recycleToStage?: number;
  recycleToPipeline?: number;
}

const leadChangeStatus: ActionDefinition<Input> = {
  key: "lead-change-status",
  type: "perform",
  resource: "lead",
  title: "Change Lead Status",
  description: "Move a lead to Active, Won, Lost or X-Dated.",
  idempotent: true,
  params: [
    { key: "leadId", label: "Lead ID", type: "number", required: true },
    {
      key: "status",
      label: "New status",
      type: "select",
      required: true,
      options: leadChangeStatusOptions,
    },
    {
      key: "date",
      label: "Date",
      type: "string",
      hint: "YYYY-MM-DD. For X-Dated: when the lead returns to Active. Otherwise: the contact " +
        "or quoted date.",
    },
    {
      key: "lossReasonId",
      label: "Loss reason ID",
      type: "number",
      hint: "Required by AgencyZoom when status is Lost. From List Loss Reasons.",
    },
    { key: "xDateType", label: "X-date recycle event name", type: "string" },
    { key: "changeLeadSourceTo", label: "Change lead source to (ID)", type: "number" },
    { key: "recycleToStage", label: "Recycle to stage ID", type: "number" },
    { key: "recycleToPipeline", label: "Recycle to pipeline ID", type: "number" },
  ],
  output: [{ key: "message", type: "string", label: "Confirmation message" }],

  execute(input, ctx) {
    const { leadId, ...body } = input;
    return new AgencyZoomClient(ctx).put<GenericSuccessResponse>(
      `/leads/${leadId}/status`,
      compact(body),
    );
  },
};

export default leadChangeStatus;
