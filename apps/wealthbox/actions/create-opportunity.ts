import type { ActionDefinition } from "@w6w/types";
import { ADDITIONAL_PROPERTIES_PARAM, compact, WealthboxClient } from "../lib/client.ts";

interface Input {
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
 * `POST /v1/opportunities` — create an Opportunity.
 *
 * `linkedTo` accepts only the FIRST contact given — dev.wealthbox.com is
 * explicit: "An array containing the contact that is linked to this
 * opportunity. Only the first contact specified will be used."
 *
 * Not idempotent: Wealthbox mints a new opportunity id per call with no
 * idempotency key on this endpoint, so a retry creates a duplicate.
 */
const createOpportunity: ActionDefinition<Input> = {
  key: "create-opportunity",
  type: "perform",
  resource: "opportunity",
  title: "Create Opportunity",
  description: "Create an Opportunity.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "targetClose", label: "Target close date", type: "datetime", required: true },
    {
      key: "probability",
      label: "Probability (%)",
      type: "number",
      required: true,
      hint: "Chance the opportunity will close, as a percentage.",
    },
    {
      key: "stage",
      label: "Stage ID",
      type: "number",
      required: true,
    },
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
    return new WealthboxClient(ctx).request("/opportunities", { method: "POST", body });
  },
};

export default createOpportunity;
