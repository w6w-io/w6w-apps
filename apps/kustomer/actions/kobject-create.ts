import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, KustomerClient, unset } from "../lib/client.ts";
import { recordOutput } from "../lib/params.ts";

interface Input {
  name: string;
  title: string;
  customer?: string;
  company?: string;
  externalId?: string;
  description?: string;
  data?: unknown;
}

/**
 * `POST /v1/klasses/{name}` — "Create KObject", verified against
 * `CreateKObjectRequest` in the Core Resources OAS. `title` is the schema's
 * only required field; `customer` or `company` links the record to a party.
 */
const kobjectCreate: ActionDefinition<Input> = {
  key: "kobject-create",
  type: "perform",
  resource: "kobject",
  title: "Create KObject",
  description: "Create a custom-object record (KObject) under a Klass.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Klass name",
      type: "string",
      required: true,
      hint: "The Klass's machine name, e.g. `order` — see List Klasses.",
    },
    { key: "title", label: "Title", type: "string", required: true },
    { key: "customer", label: "Customer ID", type: "string", row: "owner" },
    { key: "company", label: "Company ID", type: "string", row: "owner" },
    { key: "externalId", label: "External ID", type: "string" },
    { key: "description", label: "Description", type: "text" },
    {
      key: "data",
      label: "Data",
      type: "json",
      advanced: true,
      hint: "Arbitrary structured data specific to this Klass's schema.",
    },
  ],
  output: recordOutput,

  execute(input, ctx) {
    return new KustomerClient(ctx).data(`/klasses/${encodeURIComponent(input.name)}`, {
      method: "POST",
      body: compact({
        title: input.title,
        customer: unset(input.customer),
        company: unset(input.company),
        externalId: unset(input.externalId),
        description: unset(input.description),
        data: asOptionalJson<Record<string, unknown>>(input.data, "data"),
      }),
    });
  },
};

export default kobjectCreate;
