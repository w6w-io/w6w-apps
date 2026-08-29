import type { ActionDefinition } from "@w6w/types";
import { CannyClient } from "../lib/client.ts";
import { messageOutput } from "../lib/output.ts";

/**
 * `POST /v1/users/remove_user_from_company` — unlink a user from a company.
 *
 * Per Upsert User's own docs, omitting a company from that endpoint's
 * `companies` array does NOT unlink a user — this is the only way to do it.
 */
interface Input {
  id: string;
  companyID: string;
}

const userRemoveFromCompany: ActionDefinition<Input> = {
  key: "user-remove-from-company",
  type: "perform",
  resource: "user",
  title: "Remove User From Company",
  description: "Unlink a user from a company.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "User",
      type: "string",
      required: true,
      hint: "The user's unique identifier.",
    },
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
    const message = await new CannyClient(ctx).postMessage("/users/remove_user_from_company", {
      id: input.id,
      companyID: input.companyID,
    });
    return { message };
  },
};

export default userRemoveFromCompany;
