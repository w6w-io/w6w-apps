import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, type SuccessBody } from "../lib/client.ts";
import { personIdPathParam } from "../lib/params.ts";

/** `DELETE /persons/{person_id}`. Also deletes the person's field values. */
interface Input {
  personId: number;
}

const personsDelete: ActionDefinition<Input> = {
  key: "persons-delete",
  type: "perform",
  resource: "person",
  title: "Delete Person",
  description: "Delete a person and their field values.",
  idempotent: true,
  params: [personIdPathParam],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx): Promise<SuccessBody> {
    return new AffinityClient(ctx).delete(`/persons/${input.personId}`);
  },
};

export default personsDelete;
