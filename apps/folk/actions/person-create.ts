import type { ActionDefinition } from "@w6w/types";
import { FolkClient, networkPath } from "../lib/client.ts";
import { groupIdParam } from "../lib/params.ts";
import { buildPersonBody, personFieldParams, type PersonFieldsInput } from "../lib/person.ts";

interface Input extends PersonFieldsInput {
  groupId: string;
}

/** `POST /network/{networkId}/group/{groupId}/person` — `AddPersonDto`. No idempotency key documented. */
const personCreate: ActionDefinition<Input> = {
  key: "person-create",
  type: "perform",
  resource: "person",
  title: "Create Person",
  description: "Add a new person (contact) to a group.",
  idempotent: false,
  params: [groupIdParam, ...personFieldParams],
  output: [{ key: "person", type: "object", label: "The created person" }],

  async execute(input, ctx) {
    const person = await new FolkClient(ctx).request(
      networkPath(`/group/${encodeURIComponent(input.groupId)}/person`),
      { method: "POST", body: buildPersonBody(input) },
    );
    return { person };
  },
};

export default personCreate;
