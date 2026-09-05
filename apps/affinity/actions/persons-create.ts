import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, compact, toIdList, toStringList } from "../lib/client.ts";

/**
 * `POST /persons`. `emails` is required by the docs even when empty — pass
 * `[]` explicitly rather than omitting it.
 */
interface Input {
  firstName: string;
  lastName: string;
  emails?: string;
  organizationIds?: string;
}

const personsCreate: ActionDefinition<Input> = {
  key: "persons-create",
  type: "perform",
  resource: "person",
  title: "Create Person",
  description: "Create a new person.",
  idempotent: false,
  params: [
    { key: "firstName", label: "First name", type: "string", required: true },
    { key: "lastName", label: "Last name", type: "string", required: true },
    {
      key: "emails",
      label: "Email addresses",
      type: "string",
      hint: "Comma-separated. Leave empty for a person with no known email.",
    },
    {
      key: "organizationIds",
      label: "Organization IDs",
      type: "string",
      hint: "Comma-separated organization IDs this person is associated with.",
    },
  ],
  output: [{ key: "id", type: "number", label: "Person ID" }],

  execute(input, ctx) {
    return new AffinityClient(ctx).json("/persons", {
      method: "POST",
      body: compact({
        first_name: input.firstName,
        last_name: input.lastName,
        emails: toStringList(input.emails),
        organization_ids: toIdList(input.organizationIds),
      }),
    });
  },
};

export default personsCreate;
