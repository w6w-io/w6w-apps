import type { ActionDefinition } from "@w6w/types";
import { ADDITIONAL_PROPERTIES_PARAM, compact, WealthboxClient } from "../lib/client.ts";

interface Input {
  opportunityId: number;
  name: string;
  targetClose: string;
  probability: number;
  stage: number;
  amounts: unknown[];
  description?: string;
  manager?: number;
  nextStep?: string;
  linkedTo?: unknown[];
  visibleTo?: string;
  additionalProperties?: Record<string, unknown>;
}

/**
 * `PUT /v1/opportunities/{id}` — update an Opportunity.
 *
 * dev.wealthbox.com marks `name`, `target_close`, `probability`, `stage` and
 * `amounts` **required** on this endpoint, identically to Create — this is
 * not a partial patch. Moving an Opportunity's stage means resending all of
 * these, not just `stage`.
 *
 * Idempotent: applying the same field values twice leaves the Opportunity in
 * the same state, so a retry after a network failure is safe.
 */
const updateOpportunity: ActionDefinition<Input> = {
  key: "update-opportunity",
  type: "perform",
  resource: "opportunity",
  title: "Update Opportunity",
  description: "Update an existing Opportunity. Wealthbox requires resending name, target close, " +
    "probability, stage and amounts on every update.",
  idempotent: true,
  params: [
    { key: "opportunityId", label: "Opportunity ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "targetClose", label: "Target close date", type: "datetime", required: true },
    { key: "probability", label: "Probability (%)", type: "number", required: true },
    { key: "stage", label: "Stage ID", type: "number", required: true },
    {
      key: "amounts",
      label: "Amounts",
      type: "json",
      required: true,
      hint: 'Array of `{"amount": 56.76, "currency": "$", "kind": "Fee"}` — kind is one of Fee, ' +
        "Commission, AUM, Other.",
    },
    { key: "description", label: "Description", type: "text" },
    { key: "manager", label: "Manager user ID", type: "number" },
    { key: "nextStep", label: "Next step", type: "string" },
    {
      key: "linkedTo",
      label: "Linked contact",
      type: "json",
      hint: 'Array of `{"id": 1, "type": "Contact"}`. Only the first entry is used.',
    },
    {
      key: "visibleTo",
      label: "Visible to",
      type: "string",
      hint: '"Everyone", "Private", or a user-group id.',
    },
    ADDITIONAL_PROPERTIES_PARAM,
  ],
  output: [{ key: "id", type: "number", label: "Opportunity ID" }],

  execute(input, ctx) {
    const body = {
      ...compact({
        name: input.name,
        target_close: input.targetClose,
        probability: input.probability,
        stage: input.stage,
        amounts: input.amounts,
        description: input.description,
        manager: input.manager,
        next_step: input.nextStep,
        linked_to: input.linkedTo,
        visible_to: input.visibleTo,
      }),
      ...(input.additionalProperties ?? {}),
    };
    return new WealthboxClient(ctx).request(
      `/opportunities/${encodeURIComponent(input.opportunityId)}`,
      { method: "PUT", body },
    );
  },
};

export default updateOpportunity;
