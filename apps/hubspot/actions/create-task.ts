import type { ActionDefinition } from "@w6w/types";
import { HubSpotClient, type HubSpotObject } from "../lib/client.ts";
import { coerceProperties } from "../lib/crm.ts";

interface Input {
  hs_task_subject: string;
  hs_task_body?: string;
  hs_task_status?: string;
  hs_task_priority?: string;
  hs_task_type?: string;
  hs_timestamp?: string;
  hubspot_owner_id?: string;
  associations?: unknown[];
  additionalProperties?: Record<string, unknown>;
}

const createTask: ActionDefinition<Input, HubSpotObject> = {
  key: "create-task",
  type: "perform",
  resource: "engagement",
  title: "Create Task",
  description: "Log a task engagement.",
  params: [
    { key: "hs_task_subject", label: "Subject", type: "string", required: true },
    { key: "hs_task_body", label: "Body", type: "text" },
    { key: "hs_task_status", label: "Status", type: "string", default: "NOT_STARTED" },
    { key: "hs_task_priority", label: "Priority", type: "string" },
    { key: "hs_task_type", label: "Type", type: "string", default: "TODO" },
    { key: "hs_timestamp", label: "Due date", type: "datetime" },
    { key: "hubspot_owner_id", label: "Owner ID", type: "string" },
    { key: "associations", label: "Associations", type: "json" },
    { key: "additionalProperties", label: "Additional properties", type: "json" },
  ],

  async execute(input, ctx) {
    const client = new HubSpotClient(ctx);
    const properties = coerceProperties({
      hs_task_subject: input.hs_task_subject,
      hs_task_body: input.hs_task_body,
      hs_task_status: input.hs_task_status ?? "NOT_STARTED",
      hs_task_priority: input.hs_task_priority,
      hs_task_type: input.hs_task_type ?? "TODO",
      hs_timestamp: input.hs_timestamp ?? new Date().toISOString(),
      hubspot_owner_id: input.hubspot_owner_id,
      ...(input.additionalProperties ?? {}),
    });
    return client.request<HubSpotObject>(`/crm/v3/objects/tasks`, {
      method: "POST",
      body: {
        properties,
        ...(input.associations ? { associations: input.associations } : {}),
      },
    });
  },
};

export default createTask;
