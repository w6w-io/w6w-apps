import type { ActionDefinition } from "@w6w/types";
import { compact, VideoAskClient } from "../lib/client.ts";
import { organizationIdParam } from "../lib/params.ts";

/**
 * `POST /respondents` — create a contact record ahead of time (e.g. to
 * pre-fill a personalized videoask link), rather than letting VideoAsk create
 * one automatically on first page load.
 */
interface Input {
  name?: string;
  email?: string;
  phoneNumber?: string;
  organizationId?: string;
}

const respondentCreate: ActionDefinition<Input> = {
  key: "respondent-create",
  type: "perform",
  resource: "respondent",
  title: "Create Contact",
  description: "Create a respondent (contact) record.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    {
      key: "phoneNumber",
      label: "Phone number",
      type: "string",
      hint: "E.164 format, e.g. +13038675309.",
    },
    organizationIdParam,
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "phone_number", type: "string", label: "Phone number" },
  ],

  execute(input, ctx) {
    return new VideoAskClient(ctx).entity("/respondents", {
      method: "POST",
      body: compact({ name: input.name, email: input.email, phone_number: input.phoneNumber }),
      organizationId: input.organizationId,
    });
  },
};

export default respondentCreate;
