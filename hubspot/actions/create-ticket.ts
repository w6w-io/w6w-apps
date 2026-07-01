import type { ActionDefinition } from "@w6w/types";
import { crmCreate } from "../lib/crm.ts";

interface Input {
  subject: string;
  hs_pipeline: string;
  hs_pipeline_stage: string;
  hs_ticket_priority?: string;
  hs_ticket_category?: string;
  content?: string;
  hubspot_owner_id?: string;
  source_type?: string;
  additionalProperties?: Record<string, unknown>;
}

const createTicket: ActionDefinition<Input> = {
  key: "create-ticket",
  type: "perform",
  resource: "ticket",
  title: "Create Ticket",
  description: "Create a support ticket. `hs_pipeline` and `hs_pipeline_stage` are required by HubSpot.",
  params: [
    { key: "subject", label: "Subject", type: "string", required: true },
    { key: "hs_pipeline", label: "Pipeline ID", type: "string", required: true },
    { key: "hs_pipeline_stage", label: "Pipeline stage ID", type: "string", required: true },
    { key: "hs_ticket_priority", label: "Priority", type: "string" },
    { key: "hs_ticket_category", label: "Category", type: "string" },
    { key: "content", label: "Description", type: "text" },
    { key: "hubspot_owner_id", label: "Owner ID", type: "string" },
    { key: "source_type", label: "Source", type: "string" },
    { key: "additionalProperties", label: "Additional properties", type: "json" },
  ],

  async execute(input, ctx) {
    return crmCreate(ctx, "tickets", {
      properties: {
        subject: input.subject,
        hs_pipeline: input.hs_pipeline,
        hs_pipeline_stage: input.hs_pipeline_stage,
        hs_ticket_priority: input.hs_ticket_priority,
        hs_ticket_category: input.hs_ticket_category,
        content: input.content,
        hubspot_owner_id: input.hubspot_owner_id,
        source_type: input.source_type,
        ...(input.additionalProperties ?? {}),
      },
    });
  },
};

export default createTicket;
