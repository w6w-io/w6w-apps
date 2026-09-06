import type { Param } from "@w6w/types";
import { compact, unset } from "./client.ts";

/**
 * Fields shared by `opportunity-create` and `opportunity-update`.
 *
 * `ownerId`/`teamId` are both optional Params here, but Capsule's own
 * Opportunity model documents `owner` as "This and/or `team` is required" —
 * UNLIKE a Party, which silently defaults its owner to the token's own user
 * when neither is set. Skip both here and Capsule answers `422 Validation
 * Failed`. Left optional (rather than making one required) because either
 * one alone satisfies the vendor, and forcing a choice would be wrong for a
 * workflow that only ever sets `teamId`.
 */
export interface OpportunityFieldsInput {
  name?: string;
  description?: string;
  partyId?: number;
  milestoneId?: number;
  valueAmount?: number;
  valueCurrency?: string;
  expectedCloseOn?: string;
  probability?: number;
  durationBasis?: "FIXED" | "HOUR" | "DAY" | "WEEK" | "MONTH" | "QUARTER" | "YEAR";
  duration?: number;
  ownerId?: number;
  teamId?: number;
}

export const opportunityFieldParams: Param[] = [
  { key: "name", label: "Name", type: "string" },
  { key: "description", label: "Description", type: "text" },
  { key: "partyId", label: "Party ID", type: "number", row: "party" },
  { key: "milestoneId", label: "Milestone ID", type: "number", row: "party" },
  { key: "valueAmount", label: "Value amount", type: "number", row: "value" },
  {
    key: "valueCurrency",
    label: "Value currency (ISO 4217)",
    type: "string",
    row: "value",
    placeholder: "GBP",
  },
  { key: "expectedCloseOn", label: "Expected close date", type: "date" },
  {
    key: "probability",
    label: "Probability (%)",
    type: "number",
    advanced: true,
    validation: { min: 0, max: 100 },
  },
  {
    key: "durationBasis",
    label: "Duration basis",
    type: "select",
    advanced: true,
    options: [
      { value: "FIXED", label: "Fixed" },
      { value: "HOUR", label: "Hour" },
      { value: "DAY", label: "Day" },
      { value: "WEEK", label: "Week" },
      { value: "MONTH", label: "Month" },
      { value: "QUARTER", label: "Quarter" },
      { value: "YEAR", label: "Year" },
    ],
  },
  {
    key: "duration",
    label: "Duration",
    type: "number",
    advanced: true,
    hint: "Must be left blank when duration basis is Fixed.",
  },
  {
    key: "ownerId",
    label: "Owner user ID",
    type: "number",
    row: "assignment",
    hint: "Owner and/or team is required by Capsule — omitting both fails with a 422.",
  },
  { key: "teamId", label: "Team ID", type: "number", row: "assignment" },
];

export function buildOpportunityBody(input: OpportunityFieldsInput): Record<string, unknown> {
  return compact({
    name: unset(input.name),
    description: unset(input.description),
    party: input.partyId !== undefined ? { id: input.partyId } : undefined,
    milestone: input.milestoneId !== undefined ? { id: input.milestoneId } : undefined,
    value: input.valueAmount !== undefined
      ? compact({ amount: input.valueAmount, currency: unset(input.valueCurrency) })
      : undefined,
    expectedCloseOn: unset(input.expectedCloseOn),
    probability: input.probability,
    durationBasis: input.durationBasis,
    duration: input.duration,
    owner: input.ownerId !== undefined ? { id: input.ownerId } : undefined,
    team: input.teamId !== undefined ? { id: input.teamId } : undefined,
  });
}
