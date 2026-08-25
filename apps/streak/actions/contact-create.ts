import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreakClient } from "../lib/client.ts";
import { teamKeyParam } from "../lib/params.ts";

/**
 * `POST /teams/{teamKey}/contacts/` — create a contact.
 *
 * Note the **trailing slash** in the path — it is part of the documented
 * operation, distinct from `/contacts/{contactKey}` (no trailing slash) used
 * by every other contact operation. Dropping it is a routing miss, not a
 * validation error.
 */
interface Input {
  teamKey: string;
  emailAddresses: string[];
  givenName?: string;
  familyName?: string;
  title?: string;
  getIfExisting?: boolean;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a contact for a team, keyed by email address.",
  idempotent: false,
  params: [
    teamKeyParam,
    {
      key: "emailAddresses",
      label: "Email Addresses",
      type: "array",
      item: { type: "string" },
      required: true,
    },
    { key: "givenName", label: "First Name", type: "string" },
    { key: "familyName", label: "Last Name", type: "string" },
    { key: "title", label: "Job Title", type: "string", advanced: true },
    {
      key: "getIfExisting",
      label: "Return Existing If Found",
      type: "boolean",
      advanced: true,
      hint: "If a contact with this email already exists, return it instead of erroring.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The contact" }],

  execute(input, ctx) {
    return new StreakClient(ctx).sendJson(
      "POST",
      `/teams/${encodeId(input.teamKey)}/contacts/`,
      {
        emailAddresses: input.emailAddresses,
        givenName: input.givenName,
        familyName: input.familyName,
        title: input.title,
      },
      { getIfExisting: input.getIfExisting },
    );
  },
};

export default contactCreate;
