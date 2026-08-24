import type { ActionDefinition } from "@w6w/types";
import { ClickSendClient, compact } from "../lib/client.ts";

interface Input {
  listId: number;
  phoneNumber?: string;
  faxNumber?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  custom1?: string;
  custom2?: string;
  custom3?: string;
  custom4?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressCity?: string;
  addressState?: string;
  addressPostalCode?: string;
  addressCountry?: string;
}

interface ContactResponse {
  contact_id?: number;
  list_id?: number;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  fax_number?: string;
  email?: string;
  date_added?: string;
  _list_name?: string;
}

/**
 * `POST /lists/{list_id}/contacts` — add a contact to a Contact List.
 *
 * `phoneNumber`, `faxNumber` and `email` are each individually optional, but
 * ClickSend rejects the call if **all three** are blank — a contact must be
 * reachable by at least one channel. This Action does not pre-validate that
 * client-side; ClickSend's own `400` for the empty case is clear enough to
 * surface as-is.
 */
const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  idempotent: false,
  resource: "contact",
  title: "Create Contact",
  description:
    "Add a contact to a Contact List (POST /lists/{list_id}/contacts). At least one of Phone, " +
    "Fax or Email is required.",
  params: [
    { key: "listId", label: "List ID", type: "number", required: true },
    { key: "phoneNumber", label: "Phone number", type: "string", hint: "E.164 format." },
    { key: "faxNumber", label: "Fax number", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "organizationName", label: "Organization", type: "string" },
    { key: "custom1", label: "Custom 1", type: "string", advanced: true },
    { key: "custom2", label: "Custom 2", type: "string", advanced: true },
    { key: "custom3", label: "Custom 3", type: "string", advanced: true },
    { key: "custom4", label: "Custom 4", type: "string", advanced: true },
    { key: "addressLine1", label: "Address line 1", type: "string", advanced: true },
    { key: "addressLine2", label: "Address line 2", type: "string", advanced: true },
    { key: "addressCity", label: "City", type: "string", advanced: true },
    { key: "addressState", label: "State", type: "string", advanced: true },
    { key: "addressPostalCode", label: "Postal code", type: "string", advanced: true },
    {
      key: "addressCountry",
      label: "Country",
      type: "string",
      advanced: true,
      hint: "ISO 3166 alpha-2.",
    },
  ],
  output: [
    { key: "contactId", type: "number", label: "Contact ID" },
    { key: "listId", type: "number", label: "List ID" },
    { key: "listName", type: "string", label: "List name" },
  ],

  async execute(input, ctx) {
    const client = new ClickSendClient(ctx);
    const data = await client.data<ContactResponse>(
      `/lists/${encodeURIComponent(String(input.listId))}/contacts`,
      {
        method: "POST",
        body: compact({
          phone_number: input.phoneNumber,
          fax_number: input.faxNumber,
          email: input.email,
          first_name: input.firstName,
          last_name: input.lastName,
          organization_name: input.organizationName,
          custom_1: input.custom1,
          custom_2: input.custom2,
          custom_3: input.custom3,
          custom_4: input.custom4,
          address_line_1: input.addressLine1,
          address_line_2: input.addressLine2,
          address_city: input.addressCity,
          address_state: input.addressState,
          address_postal_code: input.addressPostalCode,
          address_country: input.addressCountry,
        }),
      },
    );
    return { contactId: data.contact_id, listId: data.list_id, listName: data._list_name };
  },
};

export default contactCreate;
