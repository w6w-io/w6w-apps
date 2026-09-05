import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, compact } from "../lib/client.ts";

/**
 * `GET /field-values` — every field value (cell) attached to exactly one of a
 * person, organization, opportunity, or list entry. The docs require exactly
 * one of the four id params; smart fields are not returned here (see
 * `with_interaction_dates` on the person/organization Get actions instead).
 */
interface Input {
  personId?: number;
  organizationId?: number;
  opportunityId?: number;
  listEntryId?: number;
}

const fieldValuesList: ActionDefinition<Input> = {
  key: "field-values-list",
  type: "read",
  resource: "field-value",
  title: "List Field Values",
  description:
    "Get the field values (cells) for exactly one person, organization, opportunity, or list " +
    "entry. Does not include Smart Field values.",
  params: [
    {
      key: "personId",
      label: "Person ID",
      type: "number",
      validation: { integer: true },
      hint: "Exactly one of Person/Organization/Opportunity/List Entry ID must be set.",
    },
    {
      key: "organizationId",
      label: "Organization ID",
      type: "number",
      validation: { integer: true },
    },
    {
      key: "opportunityId",
      label: "Opportunity ID",
      type: "number",
      validation: { integer: true },
    },
    { key: "listEntryId", label: "List Entry ID", type: "number", validation: { integer: true } },
  ],
  output: [{ key: "field_values", type: "array", label: "Field values" }],

  execute(input, ctx) {
    const ids = [input.personId, input.organizationId, input.opportunityId, input.listEntryId]
      .filter((v) => v !== undefined && v !== null);
    if (ids.length !== 1) {
      throw new Error(
        "Exactly one of personId, organizationId, opportunityId, or listEntryId is required",
      );
    }
    return new AffinityClient(ctx).json("/field-values", {
      query: compact({
        person_id: input.personId,
        organization_id: input.organizationId,
        opportunity_id: input.opportunityId,
        list_entry_id: input.listEntryId,
      }),
    });
  },
};

export default fieldValuesList;
