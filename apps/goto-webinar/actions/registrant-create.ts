import type { ActionDefinition } from "@w6w/types";
import { GotoWebinarClient, resolveOrganizerKey, unset } from "../lib/client.ts";

/**
 * `POST /organizers/{organizerKey}/webinars/{webinarKey}/registrants` — register an attendee.
 *
 * Only `firstName`, `lastName` and `email` are required; the rest of the documented body
 * (address, custom `responses` to registration questions, …) is optional and mostly
 * account-specific, so this action covers the common fields rather than every optional one.
 */
interface Input {
  organizerKey?: string;
  webinarKey: string;
  firstName: string;
  lastName: string;
  email: string;
  organization?: string;
  jobTitle?: string;
  phone?: string;
}

const registrantCreate: ActionDefinition<Input> = {
  key: "registrant-create",
  type: "perform",
  resource: "registrant",
  title: "Create Registrant",
  description: "Register someone for a webinar.",
  idempotent: false,
  params: [
    {
      key: "organizerKey",
      label: "Organizer key",
      type: "string",
      hint: "Defaults to the key captured when this connection was made.",
    },
    { key: "webinarKey", label: "Webinar key", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string", required: true },
    { key: "lastName", label: "Last name", type: "string", required: true },
    { key: "email", label: "Email", type: "string", required: true },
    { key: "organization", label: "Organization", type: "string" },
    { key: "jobTitle", label: "Job title", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
  ],
  output: [
    { key: "registrantKey", type: "string", label: "Registrant key" },
    { key: "joinUrl", type: "string", label: "Join URL" },
  ],

  async execute(input, ctx) {
    const organizerKey = resolveOrganizerKey(ctx.connection, input.organizerKey);
    return await new GotoWebinarClient(ctx).request(
      `/organizers/${organizerKey}/webinars/${input.webinarKey}/registrants`,
      {
        method: "POST",
        body: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          organization: unset(input.organization),
          jobTitle: unset(input.jobTitle),
          phone: unset(input.phone),
        },
      },
    );
  },
};

export default registrantCreate;
