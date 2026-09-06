import type { ActionDefinition } from "@w6w/types";
import { FolkClient, networkPath } from "../lib/client.ts";
import { groupIdParam } from "../lib/params.ts";
import { buildPersonBody, personFieldParams, type PersonFieldsInput } from "../lib/person.ts";

interface Input extends PersonFieldsInput {
  groupId: string;
  personId: string;
}

/**
 * `PUT /network/{networkId}/group/{groupId}/person/{personId}` — the OAS
 * calls this a PUT with the same `AddPersonDto` body as create, but that
 * schema has no required fields, so this is treated as a partial update:
 * `buildPersonBody` drops any field left blank rather than sending it as
 * `undefined`/null and risking folk clearing it (unverifiable either way
 * without a live credential — see README).
 */
const personUpdate: ActionDefinition<Input> = {
  key: "person-update",
  type: "perform",
  resource: "person",
  title: "Update Person",
  description: "Update a person (contact) in a group. Only the fields you set are sent.",
  idempotent: true,
  params: [
    groupIdParam,
    {
      key: "personId",
      label: "Person ID",
      type: "string",
      required: true,
      hint: "From person-find or the person object returned by person-create.",
    },
    ...personFieldParams,
  ],
  output: [{ key: "person", type: "object", label: "The updated person" }],

  async execute(input, ctx) {
    const person = await new FolkClient(ctx).request(
      networkPath(
        `/group/${encodeURIComponent(input.groupId)}/person/${encodeURIComponent(input.personId)}`,
      ),
      { method: "PUT", body: buildPersonBody(input) },
    );
    return { person };
  },
};

export default personUpdate;
