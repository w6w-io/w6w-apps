import type { ActionDefinition } from "@w6w/types";
import { encodeId, RaindropClient } from "../lib/client.ts";
import { collectionPathIdParam } from "../lib/params.ts";

/**
 * `GET /rest/v1/collection/{id}/sharing` — who this collection is shared with.
 *
 * Returns one record per collaborator: `_id`, `email`, `email_MD5`, `fullName`,
 * `registered` and `role` (`member` = write + can invite, `viewer` = read-only).
 *
 * **`email` is other people's email addresses**, and it is not always populated:
 * the reference notes it is "Empty when authorized user have read-only access".
 * So the same call returns different amounts of personal data depending on who
 * is asking, and a workflow that logs this result is logging third-party PII.
 * The action returns the records verbatim — filtering someone else's collaborator
 * list would be this app inventing a policy — but the description says what is in
 * them.
 */
interface Input {
  id: number;
}

const collectionSharingList: ActionDefinition<Input> = {
  key: "collection-sharing-list",
  type: "read",
  resource: "sharing",
  title: "List Collaborators",
  description:
    "List the collaborators on a shared collection with their access level. Records include " +
    "collaborators' email addresses (blank if you only have read-only access).",
  params: [collectionPathIdParam],
  output: [{ key: "items", type: "array", label: "Collaborators" }],

  async execute(input, ctx) {
    return {
      items: await new RaindropClient(ctx).items(`/collection/${encodeId(input.id)}/sharing`),
    };
  },
};

export default collectionSharingList;
