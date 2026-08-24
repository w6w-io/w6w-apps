import type { ActionDefinition } from "@w6w/types";
import { encodeId, ServiceM8Client } from "../lib/client.ts";

/** `GET /company/{uuid}.json` — retrieve a single Client. */
interface Input {
  companyUuid: string;
}

const companyGet: ActionDefinition<Input, unknown> = {
  key: "company-get",
  type: "read",
  resource: "company",
  title: "Get Client",
  description: "Retrieve a single Client (Company) by UUID.",
  params: [
    { key: "companyUuid", label: "Company UUID", type: "string", required: true },
  ],
  output: [
    { key: "uuid", type: "string", label: "Company UUID" },
    { key: "name", type: "string", label: "Company name" },
    { key: "address", type: "string", label: "Address" },
    { key: "active", type: "number", label: "1 if active, 0 if archived" },
  ],

  execute(input, ctx) {
    return new ServiceM8Client(ctx).json(`/company/${encodeId(input.companyUuid)}.json`);
  },
};

export default companyGet;
