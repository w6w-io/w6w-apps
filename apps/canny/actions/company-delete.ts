import type { ActionDefinition } from "@w6w/types";
import { CannyClient } from "../lib/client.ts";
import { messageOutput } from "../lib/output.ts";

/** `POST /v1/companies/delete` — permanently delete a company. */
interface Input {
  companyID: string;
}

const companyDelete: ActionDefinition<Input> = {
  key: "company-delete",
  type: "perform",
  resource: "company",
  title: "Delete Company",
  description: "Permanently delete a company.",
  idempotent: true,
  params: [
    {
      key: "companyID",
      label: "Company",
      type: "string",
      required: true,
      hint: "The identifier you used when this company was created.",
    },
  ],
  output: messageOutput,

  async execute(input, ctx) {
    const message = await new CannyClient(ctx).postMessage("/companies/delete", {
      companyID: input.companyID,
    });
    return { message };
  },
};

export default companyDelete;
