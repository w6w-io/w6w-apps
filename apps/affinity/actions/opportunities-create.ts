import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, compact, toIdList } from "../lib/client.ts";
import { listIdPathParam } from "../lib/params.ts";

/**
 * `POST /opportunities`. Unlike people and organizations, an opportunity
 * lives on exactly one list, fixed at creation — `listId` must name a list
 * of type Opportunity (type 8).
 */
interface Input {
  name: string;
  listId: number;
  personIds?: string;
  organizationIds?: string;
}

const opportunitiesCreate: ActionDefinition<Input> = {
  key: "opportunities-create",
  type: "perform",
  resource: "opportunity",
  title: "Create Opportunity",
  description: "Create a new opportunity on an Opportunity-type list.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { ...listIdPathParam, hint: "Must be a list of type Opportunity. Fixed after creation." },
    { key: "personIds", label: "Person IDs", type: "string", hint: "Comma-separated." },
    { key: "organizationIds", label: "Organization IDs", type: "string", hint: "Comma-separated." },
  ],
  output: [{ key: "id", type: "number", label: "Opportunity ID" }],

  execute(input, ctx) {
    return new AffinityClient(ctx).json("/opportunities", {
      method: "POST",
      body: compact({
        name: input.name,
        list_id: input.listId,
        person_ids: toIdList(input.personIds),
        organization_ids: toIdList(input.organizationIds),
      }),
    });
  },
};

export default opportunitiesCreate;
