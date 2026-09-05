import type { ActionDefinition } from "@w6w/types";
import { compact, TapfiliateClient } from "../lib/client.ts";
import { addressParam, companyParam, customFieldsParam } from "../lib/params.ts";

/** `POST /affiliates/` */
interface Input {
  firstname: string;
  lastname: string;
  email?: string;
  password?: string;
  company?: unknown;
  address?: unknown;
  customFields?: unknown;
}

const affiliateCreate: ActionDefinition<Input> = {
  key: "affiliate-create",
  type: "perform",
  resource: "affiliate",
  title: "Create Affiliate",
  description: "Create a new affiliate account.",
  idempotent: false,
  params: [
    { key: "firstname", label: "First name", type: "string", required: true },
    { key: "lastname", label: "Last name", type: "string", required: true },
    { key: "email", label: "Email", type: "string" },
    {
      key: "password",
      label: "Password",
      type: "secret",
      hint: "If omitted, Tapfiliate generates one and returns it in the response.",
    },
    companyParam,
    addressParam,
    customFieldsParam,
  ],
  output: [
    { key: "id", type: "string", label: "New affiliate id" },
    {
      key: "password",
      type: "string",
      label: "The generated password, only when none was supplied",
    },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).json("/affiliates/", {
      method: "POST",
      body: compact({
        firstname: input.firstname,
        lastname: input.lastname,
        email: input.email,
        password: input.password,
        company: input.company,
        address: input.address,
        custom_fields: input.customFields,
      }),
    });
  },
};

export default affiliateCreate;
