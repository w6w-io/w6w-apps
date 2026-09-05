import type { ActionDefinition } from "@w6w/types";
import { JsmClient, unset } from "../lib/client.ts";
import { serviceDeskId } from "../lib/params.ts";

interface Input {
  serviceDeskId: string;
  requestTypeId: string;
  summary: string;
  description?: string;
  requestFieldValues?: Record<string, unknown>;
  requestParticipants?: string;
  raiseOnBehalfOf?: string;
  isAdfRequest?: boolean;
}

/**
 * Unlike Jira Software's own `/rest/api/3` (which the sibling `jira` app
 * calls), this endpoint's `requestFieldValues` are plain strings by default —
 * Atlassian Document Format is opt-in per `RequestCreateDTO.isAdfRequest`,
 * not required. `summary` and `description` are the two fields every request
 * type declares; anything a specific request type additionally requires goes
 * in the free-form `requestFieldValues` JSON map (field id → value), merged
 * on top of the two named ones.
 */
const requestCreate: ActionDefinition<Input> = {
  key: "request-create",
  type: "perform",
  resource: "request",
  title: "Create Customer Request",
  description: "Raise a new customer request against a service desk's request type.",
  idempotent: false,
  params: [
    serviceDeskId,
    {
      key: "requestTypeId",
      label: "Request Type ID",
      type: "string",
      required: true,
      hint: "From `requesttype-get-many`.",
    },
    { key: "summary", label: "Summary", type: "string", required: true },
    { key: "description", label: "Description", type: "text", config: { multiline: true } },
    {
      key: "requestFieldValues",
      label: "Additional field values",
      type: "json",
      advanced: true,
      hint:
        "JSON map of Jira field IDs to values, for anything this request type requires beyond summary/description.",
    },
    {
      key: "requestParticipants",
      label: "Participant account IDs",
      type: "string",
      advanced: true,
      hint: "Comma-separated `accountId` values to add as participants.",
    },
    {
      key: "raiseOnBehalfOf",
      label: "Raise on behalf of (account ID)",
      type: "string",
      advanced: true,
      hint:
        "Requires the connection to be an agent with permission to create on a customer's behalf.",
    },
    {
      key: "isAdfRequest",
      label: "Field values are ADF",
      type: "boolean",
      advanced: true,
      hint:
        "Set only if description/requestFieldValues carry Atlassian Document Format objects, not plain text.",
    },
  ],
  output: [
    { key: "issueId", type: "string", label: "Request ID (peer issue ID)" },
    { key: "issueKey", type: "string", label: "Request key (peer issue key)" },
    { key: "currentStatus", type: "object", label: "Current status" },
    { key: "_links", type: "object", label: "Links (including the portal URL)" },
  ],

  execute(input, ctx) {
    const participants = unset(input.requestParticipants)?.split(",").map((s) => s.trim())
      .filter(Boolean);
    return new JsmClient(ctx).request("/request", {
      method: "POST",
      body: {
        serviceDeskId: input.serviceDeskId,
        requestTypeId: input.requestTypeId,
        isAdfRequest: input.isAdfRequest,
        raiseOnBehalfOf: unset(input.raiseOnBehalfOf),
        requestParticipants: participants && participants.length > 0 ? participants : undefined,
        requestFieldValues: {
          summary: input.summary,
          description: unset(input.description),
          ...(input.requestFieldValues ?? {}),
        },
      },
    });
  },
};

export default requestCreate;
