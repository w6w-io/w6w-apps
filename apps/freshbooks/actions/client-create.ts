import type { ActionDefinition } from "@w6w/types";
import { compact, FreshBooksClient, jsonObject, unset } from "../lib/client.ts";
import { additionalFields } from "../lib/params.ts";

interface Input {
  fname?: string;
  lname?: string;
  email?: string;
  organization?: string;
  busPhone?: string;
  note?: string;
  additionalFields?: unknown;
}

const clientCreate: ActionDefinition<Input> = {
  key: "client-create",
  type: "perform",
  resource: "client",
  title: "Create Client",
  description: "Create a new client.",
  // FreshBooks mints a new client id per call and offers no request key, so
  // a retry creates a duplicate client.
  idempotent: false,
  params: [
    { key: "fname", label: "First name", type: "string" },
    { key: "lname", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "organization", label: "Organization", type: "string" },
    { key: "busPhone", label: "Business phone", type: "string", advanced: true },
    { key: "note", label: "Note", type: "text", advanced: true },
    additionalFields,
  ],
  output: [{ key: "client", type: "object", label: "Client" }],

  execute(input, ctx) {
    return new FreshBooksClient(ctx).request("accounting", "/users/clients", {
      method: "POST",
      body: {
        client: {
          ...compact({
            fname: unset(input.fname),
            lname: unset(input.lname),
            email: unset(input.email),
            organization: unset(input.organization),
            bus_phone: unset(input.busPhone),
            note: unset(input.note),
          }),
          ...jsonObject(input.additionalFields, "additionalFields"),
        },
      },
    });
  },
};

export default clientCreate;
