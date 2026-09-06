import type { Param } from "@w6w/types";
import { compact, unset } from "./client.ts";

/**
 * Fields shared by `task-create` and `task-update`.
 *
 * Capsule's Task model states plainly that "only one of `party`, `opportunity`
 * or `kase` can be not `null`" — this app exposes `partyId`/`opportunityId`
 * (not `kase`/Project, out of scope) and leaves it to the caller not to set
 * both; Capsule itself rejects a request that does.
 */
export interface TaskFieldsInput {
  description?: string;
  detail?: string;
  dueOn?: string;
  dueTime?: string;
  partyId?: number;
  opportunityId?: number;
  ownerId?: number;
  categoryId?: number;
  status?: "OPEN" | "COMPLETED" | "PENDING";
}

export const taskFieldParams: Param[] = [
  { key: "description", label: "Description", type: "string" },
  { key: "detail", label: "Detail", type: "text", advanced: true },
  { key: "dueOn", label: "Due date", type: "date", row: "due" },
  {
    key: "dueTime",
    label: "Due time",
    type: "string",
    row: "due",
    placeholder: "18:00:00",
    hint: "In the user's own timezone, not UTC. HH:MM:SS.",
  },
  {
    key: "partyId",
    label: "Party ID",
    type: "number",
    row: "link",
    hint: "Only one of Party ID / Opportunity ID may be set.",
  },
  { key: "opportunityId", label: "Opportunity ID", type: "number", row: "link" },
  { key: "ownerId", label: "Owner user ID", type: "number", advanced: true },
  { key: "categoryId", label: "Category ID", type: "number", advanced: true },
];

export function buildTaskBody(input: TaskFieldsInput): Record<string, unknown> {
  return compact({
    description: unset(input.description),
    detail: unset(input.detail),
    dueOn: unset(input.dueOn),
    dueTime: unset(input.dueTime),
    status: input.status,
    party: input.partyId !== undefined ? { id: input.partyId } : undefined,
    opportunity: input.opportunityId !== undefined ? { id: input.opportunityId } : undefined,
    owner: input.ownerId !== undefined ? { id: input.ownerId } : undefined,
    category: input.categoryId !== undefined ? { id: input.categoryId } : undefined,
  });
}
