import type { ActionDefinition } from "@w6w/types";
import { encodeId, QualtricsClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  directoryId: string;
  contactId: string;
}

/**
 * `GET /API/v3/directories/{directoryId}/contacts/{contactId}` — one contact.
 *
 * Confirmed live on 2026-09-22 (`400 ATP_2` unauthenticated, not a 404).
 */
const directoryContactGet: ActionDefinition<Input> = {
  key: "directory-contact-get",
  type: "read",
  resource: "directory-contact",
  title: "Get Directory Contact",
  description: "Fetch one XM Directory contact by id.",
  params: [
    idParam("directoryId", "Directory ID", "Read it from List Directory Contacts' source pool."),
    idParam(
      "contactId",
      "Contact ID",
      "Starts with `CID_`. Read it from List Directory Contacts.",
    ),
  ],
  output: [
    { key: "contactId", type: "string", label: "Contact ID" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "phone", type: "string", label: "Phone" },
    { key: "language", type: "string", label: "Language" },
    { key: "unsubscribed", type: "boolean", label: "Unsubscribed" },
  ],

  async execute(input, ctx) {
    return await new QualtricsClient(ctx).request(
      `/directories/${encodeId(input.directoryId)}/contacts/${encodeId(input.contactId)}`,
    );
  },
};

export default directoryContactGet;
