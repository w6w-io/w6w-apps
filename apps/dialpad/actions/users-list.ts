import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, type DialpadPage } from "../lib/client.ts";
import { cursorParam, userStateOptions } from "../lib/params.ts";

/**
 * `GET /api/v2/users` — company users, filterable by name, email, phone number
 * or state.
 *
 * The vendor's own note: `limit` has been soft-deprecated — values over 100
 * silently clamp to 100 and higher values may 400. This app never sends
 * `limit` at all, matching the vendor's current guidance rather than a value
 * that could start erroring.
 */
interface Input {
  cursor?: string;
  firstName?: string;
  lastName?: string;
  state?: string;
  companyAdmin?: boolean;
  email?: string;
  number?: string;
  forwardingNumber?: boolean;
}

const usersList: ActionDefinition<Input> = {
  key: "users-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description: "List company users, optionally filtered by name, email, phone number or state.",
  params: [
    cursorParam,
    {
      key: "firstName",
      label: "First name prefix",
      type: "string",
      hint: 'Prefix match, e.g. "jo" matches "John". Cannot be combined with email or number.',
    },
    {
      key: "lastName",
      label: "Last name prefix",
      type: "string",
      hint: "Prefix match. Cannot be combined with email or number.",
    },
    {
      key: "state",
      label: "State",
      type: "select",
      options: userStateOptions,
      hint: "Defaults to active.",
    },
    {
      key: "companyAdmin",
      label: "Company admin only",
      type: "boolean",
      hint: "Leave empty to return both admins and non-admins.",
    },
    { key: "email", label: "Email", type: "string" },
    {
      key: "number",
      label: "Phone number",
      type: "string",
      hint: "E164 format.",
    },
    {
      key: "forwardingNumber",
      label: "Match forwarding numbers too",
      type: "boolean",
      hint: "When true, Phone number is also matched against forwarding numbers the user added " +
        "to their own profile. Only applies together with Phone number.",
    },
  ],
  output: [
    { key: "cursor", type: "string", label: "Next page cursor (null on the last page)" },
    { key: "items", type: "array", label: "Users on this page" },
  ],

  execute(input, ctx) {
    return new DialpadClient(ctx).json<DialpadPage<unknown>>("/users", {
      query: {
        cursor: input.cursor,
        first_name: input.firstName,
        last_name: input.lastName,
        state: input.state,
        company_admin: input.companyAdmin,
        email: input.email,
        number: input.number,
        forwarding_number: input.forwardingNumber,
      },
    });
  },
};

export default usersList;
