import type { ActionDefinition } from "@w6w/types";
import { compact, SendPulseClient } from "../lib/client.ts";

interface Input {
  pipelineId: number;
  stepId: number;
  name?: string;
  price?: number;
  currency?: string;
  responsibleId?: number;
  contactId?: number;
  sourceId?: number;
}

/**
 * `POST /crm/v1/deals` — creates a deal in one pipeline step. `pipelineId`
 * and `stepId` are the only required fields; SendPulse documents no
 * idempotency key for this endpoint, so a retried call creates a second
 * deal rather than returning the first.
 */
const action: ActionDefinition<Input> = {
  key: "deal-create",
  type: "perform",
  resource: "deal",
  title: "Create a deal",
  description: "Create a deal in a pipeline step. Get `pipelineId`/`stepId` from " +
    "`pipelines-list`/`pipeline-steps-list`.",
  idempotent: false,
  params: [
    { key: "pipelineId", label: "Pipeline ID", type: "number", required: true },
    { key: "stepId", label: "Step ID", type: "number", required: true },
    { key: "name", label: "Deal name", type: "string", hint: "Max 255 characters." },
    { key: "price", label: "Amount", type: "number" },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      hint: "UAH, USD or EUR — SendPulse accepts no other values.",
    },
    {
      key: "responsibleId",
      label: "Responsible team member ID",
      type: "number",
      hint: "From `users-list`. Left unassigned if omitted.",
    },
    {
      key: "contactId",
      label: "Contact ID",
      type: "number",
      hint: "Attach an existing contact to the deal. From `contacts-list`/`contact-create`.",
    },
    {
      key: "sourceId",
      label: "Custom source ID",
      type: "number",
      hint: "Your own external-source identifier for this deal.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Created deal" },
  ],

  async execute(input, ctx) {
    const body = compact({
      pipelineId: input.pipelineId,
      stepId: input.stepId,
      name: input.name,
      price: input.price,
      currency: input.currency,
      responsibleId: input.responsibleId,
      sourceId: input.sourceId,
      contact: input.contactId !== undefined ? [input.contactId] : undefined,
    });
    return await new SendPulseClient(ctx).crm("/deals", { method: "POST", body });
  },
};

export default action;
