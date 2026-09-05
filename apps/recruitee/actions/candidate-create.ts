import type { ActionDefinition } from "@w6w/types";
import { RecruiteeClient, toNumberList } from "../lib/client.ts";

/**
 * `POST /c/{company_id}/candidates` — verified against the `Create candidate`
 * resource. The vendor's own example body:
 *
 * ```json
 * {"candidate": {"custom_fields": [{"label": "Pets", "values": ["Cats", "Dogs"]}], "name": "…"}}
 * ```
 *
 * `custom_fields` is exposed exactly in that `[{label, values}]` shape rather
 * than reshaped, since it is the one form this app can point at a real
 * example for. `offers`/`offer_id` are documented as flat, top-level params on
 * this endpoint (siblings of `candidate`, not nested inside it) — attaching
 * the new candidate straight to one or more job offers.
 *
 * `emails`/`phones` are not shown in the "URI Parameters" block (that block
 * only lists this endpoint's flat params, not `candidate`'s own nested
 * fields), but both appear as plain string arrays on every candidate object
 * this app reads back (`candidate-get`/`candidate-list`), so they are
 * exposed here on that evidence.
 */
interface Input {
  name: string;
  emails?: string[];
  phones?: string[];
  customFields?: Array<{ label: string; values: string[] }>;
  offerIds?: number[] | string;
}

const candidateCreate: ActionDefinition<Input> = {
  key: "candidate-create",
  type: "perform",
  resource: "candidate",
  title: "Create Candidate",
  description: "Create a new candidate, optionally attaching them to one or more job offers.",
  // Every call creates a brand-new candidate — there is no upsert-by-name/email
  // key documented, so retrying a call that actually reached Recruitee creates
  // a duplicate.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "emails",
      label: "Emails",
      type: "array",
      item: { type: "string" },
    },
    {
      key: "phones",
      label: "Phones",
      type: "array",
      item: { type: "string" },
    },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      hint: 'Array of `{"label": "…", "values": ["…"]}` objects, matching Recruitee\'s own ' +
        "example exactly.",
    },
    {
      key: "offerIds",
      label: "Attach to job offer IDs",
      type: "array",
      item: { type: "number" },
      hint: "Immediately apply this candidate to these offers.",
    },
  ],
  output: [
    { key: "candidate", type: "object", label: "The created candidate" },
    { key: "references", type: "array", label: "Related admins/offers the response references" },
  ],

  execute(input, ctx) {
    return new RecruiteeClient(ctx).request("/candidates", {
      method: "POST",
      body: {
        candidate: {
          name: input.name,
          emails: input.emails,
          phones: input.phones,
          custom_fields: input.customFields,
        },
        offers: toNumberList(input.offerIds),
      },
    });
  },
};

export default candidateCreate;
