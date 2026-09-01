import type { ActionDefinition } from "@w6w/types";
import { compact, customField, FreshsalesClient, unset } from "../lib/client.ts";
import { accountOutput } from "../lib/params.ts";

interface Input {
  accountId: number;
  name?: string;
  website?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  country?: string;
  numberOfEmployees?: number;
  annualRevenue?: number;
  customField?: unknown;
}

const accountUpdate: ActionDefinition<Input> = {
  key: "account-update",
  type: "perform",
  resource: "account",
  title: "Update Account",
  description:
    'Update an account (Freshsales\'s "Sales Account"). Only fields you set are changed.',
  idempotent: true,
  params: [
    { key: "accountId", label: "Account ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "website", label: "Website", type: "string", row: "web" },
    { key: "phone", label: "Phone", type: "string", row: "web" },
    { key: "address", label: "Address", type: "string", advanced: true },
    { key: "city", label: "City", type: "string", row: "location", advanced: true },
    { key: "state", label: "State", type: "string", row: "location", advanced: true },
    { key: "zipcode", label: "Zip code", type: "string", row: "location", advanced: true },
    { key: "country", label: "Country", type: "string", row: "location", advanced: true },
    {
      key: "numberOfEmployees",
      label: "Number of employees",
      type: "number",
      advanced: true,
      row: "size",
    },
    { key: "annualRevenue", label: "Annual revenue", type: "number", advanced: true, row: "size" },
    {
      key: "customField",
      label: "Custom field",
      type: "json",
      advanced: true,
      hint: '{ "cf_domain_name": "acme.com" }',
    },
  ],
  output: accountOutput,

  execute(input, ctx) {
    return new FreshsalesClient(ctx).resource(
      "sales_account",
      `/sales_accounts/${input.accountId}`,
      {
        method: "PUT",
        body: {
          sales_account: compact({
            name: unset(input.name),
            website: unset(input.website),
            phone: unset(input.phone),
            address: unset(input.address),
            city: unset(input.city),
            state: unset(input.state),
            zipcode: unset(input.zipcode),
            country: unset(input.country),
            number_of_employees: input.numberOfEmployees,
            annual_revenue: input.annualRevenue,
            custom_field: customField(input.customField),
          }),
        },
      },
    );
  },
};

export default accountUpdate;
