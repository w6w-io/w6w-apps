import type { ActionDefinition } from "@w6w/types";
import { RecruiteeClient } from "../lib/client.ts";

/**
 * `POST /c/{company_id}/offers` — "Create offer".
 *
 * The vendor's own recorded example creates an offer from a requisition
 * (`{"requisition_id": 117}`), which this app does not otherwise cover.
 * `title` and `department_id` are exposed instead, on the strength of every
 * offer object this app reads back (`offer-get`/`offer-list`) always carrying
 * both — not on a documented request-body schema, since the "URI Parameters"
 * block for this endpoint lists none of `offer`'s own nested fields. A wider
 * field set (salary, location, custom fields, pipeline template, …) is left
 * out rather than guessed.
 */
interface Input {
  title: string;
  departmentId?: number;
  description?: string;
}

const offerCreate: ActionDefinition<Input> = {
  key: "offer-create",
  type: "perform",
  resource: "offer",
  title: "Create Job Offer",
  description: "Create a new job offer as a draft.",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    { key: "departmentId", label: "Department ID", type: "number", validation: { integer: true } },
    { key: "description", label: "Description", type: "text" },
  ],
  output: [{ key: "offer", type: "object", label: "The created job offer" }],

  execute(input, ctx) {
    return new RecruiteeClient(ctx).request("/offers", {
      method: "POST",
      body: {
        offer: {
          title: input.title,
          department_id: input.departmentId,
          description: input.description,
        },
      },
    });
  },
};

export default offerCreate;
