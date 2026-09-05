import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, compact } from "../lib/client.ts";

/**
 * `POST /lists` — creates a new List. `type` picks which entity the list
 * holds (0 person, 1 organization, 8 opportunity) and cannot be changed
 * afterward.
 */
interface Input {
  name: string;
  type: number;
  isPublic: boolean;
  ownerId?: number;
}

const listsCreate: ActionDefinition<Input> = {
  key: "lists-create",
  type: "perform",
  resource: "list",
  title: "Create List",
  description: "Create a new List of people, organizations, or opportunities.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "type",
      label: "Entity type",
      type: "select",
      required: true,
      options: [
        { value: "0", label: "Person" },
        { value: "1", label: "Organization" },
        { value: "8", label: "Opportunity" },
      ],
      hint: "Fixed at creation — a list only ever holds one entity type.",
    },
    {
      key: "isPublic",
      label: "Public",
      type: "boolean",
      required: true,
      default: true,
      hint: "Public lists are visible to everyone on the Affinity account; private lists are " +
        "visible only to the owner and anyone granted access.",
    },
    {
      key: "ownerId",
      label: "Owner (internal person ID)",
      type: "number",
      validation: { integer: true },
      hint: "Defaults to the owner of this API key.",
    },
  ],
  output: [{ key: "id", type: "number", label: "List ID" }],

  execute(input, ctx) {
    return new AffinityClient(ctx).json("/lists", {
      method: "POST",
      body: compact({
        name: input.name,
        type: Number(input.type),
        is_public: input.isPublic,
        owner_id: input.ownerId,
      }),
    });
  },
};

export default listsCreate;
