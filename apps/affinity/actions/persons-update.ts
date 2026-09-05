import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, compact, toIdList, toStringList } from "../lib/client.ts";
import { personIdPathParam } from "../lib/params.ts";

/**
 * `PUT /persons/{person_id}`. The docs warn that adding a new email or
 * organization requires re-sending the existing values too — this endpoint
 * does not merge, it replaces whichever of `emails`/`organization_ids` you
 * send.
 */
interface Input {
  personId: number;
  firstName?: string;
  lastName?: string;
  emails?: string;
  organizationIds?: string;
}

const personsUpdate: ActionDefinition<Input> = {
  key: "persons-update",
  type: "perform",
  resource: "person",
  title: "Update Person",
  description:
    "Update a person. To add an email or organization, resend the existing ones too — this " +
    "replaces the list rather than merging into it.",
  idempotent: false,
  params: [
    personIdPathParam,
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    {
      key: "emails",
      label: "Email addresses",
      type: "string",
      hint: "Comma-separated. Replaces the full list — include existing emails you want kept.",
    },
    {
      key: "organizationIds",
      label: "Organization IDs",
      type: "string",
      hint: "Comma-separated. Replaces the full list — include existing IDs you want kept.",
    },
  ],
  output: [{ key: "id", type: "number", label: "Person ID" }],

  execute(input, ctx) {
    return new AffinityClient(ctx).json(`/persons/${input.personId}`, {
      method: "PUT",
      body: compact({
        first_name: input.firstName,
        last_name: input.lastName,
        emails: input.emails === undefined ? undefined : toStringList(input.emails),
        organization_ids: toIdList(input.organizationIds),
      }),
    });
  },
};

export default personsUpdate;
