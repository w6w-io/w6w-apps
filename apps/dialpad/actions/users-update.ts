import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, encodeId } from "../lib/client.ts";
import { licenseOptions, toStringArray } from "../lib/params.ts";

/**
 * `PATCH /api/v2/users/{id}` — update fields on an existing user.
 *
 * A `PATCH` here fully replaces the fields it names (e.g. `phone_numbers` is
 * the new complete list, not an addition) — sending the same body twice ends
 * in the same state, so this is declared idempotent.
 */
interface Input {
  userId: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  emails?: string;
  license?: string;
  state?: "active" | "suspended";
  extension?: string;
  forwardingNumbers?: string;
  internationalDialingEnabled?: boolean;
  isSuperAdmin?: boolean;
  officeId?: string;
}

const usersUpdate: ActionDefinition<Input> = {
  key: "users-update",
  type: "perform",
  resource: "user",
  title: "Update User",
  description: "Update the provided fields for an existing user.",
  idempotent: true,
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      hint: "The user's numeric id, or \"me\" for a user-level API key's own user.",
    },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "jobTitle", label: "Job title", type: "string" },
    {
      key: "emails",
      label: "Emails",
      type: "string",
      hint: "Comma-separated. The first is the user's primary email. Replaces the full list.",
    },
    {
      key: "license",
      label: "License",
      type: "select",
      options: licenseOptions,
      hint: "Changing this affects billing.",
    },
    {
      key: "state",
      label: "State",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "suspended", label: "Suspended" },
      ],
      hint: "Suspend or re-activate the user.",
    },
    { key: "extension", label: "Extension", type: "string" },
    {
      key: "forwardingNumbers",
      label: "Forwarding numbers",
      type: "string",
      hint: "Comma-separated E164 numbers dialed in addition to the user's Dialpad number(s). " +
        "Replaces the full list.",
    },
    {
      key: "internationalDialingEnabled",
      label: "International dialing enabled",
      type: "boolean",
    },
    {
      key: "isSuperAdmin",
      label: "Is company super admin",
      type: "boolean",
    },
    {
      key: "officeId",
      label: "Move to office ID",
      type: "string",
      hint: "Moves the user to this office. The user must have no phone numbers assigned first.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "display_name", type: "string", label: "Display name" },
  ],

  execute(input, ctx) {
    return new DialpadClient(ctx).json(`/users/${encodeId(input.userId)}`, {
      method: "PATCH",
      body: {
        first_name: input.firstName,
        last_name: input.lastName,
        job_title: input.jobTitle,
        emails: toStringArray(input.emails),
        license: input.license,
        state: input.state,
        extension: input.extension,
        forwarding_numbers: toStringArray(input.forwardingNumbers),
        international_dialing_enabled: input.internationalDialingEnabled,
        is_super_admin: input.isSuperAdmin,
        office_id: input.officeId ? Number(input.officeId) : undefined,
      },
    });
  },
};

export default usersUpdate;
