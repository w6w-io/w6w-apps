import type { ActionDefinition } from "@w6w/types";
import { compact, ServiceM8Client } from "../lib/client.ts";

/**
 * `POST /jobmaterial.json` — add a line item to a Job's Quote/Invoice.
 * `quantity` is the only field `JobMaterialCreate` marks `required`.
 */
interface Input {
  jobUuid?: string;
  name?: string;
  quantity: string;
  price?: string;
}

const jobMaterialCreate: ActionDefinition<Input, { uuid?: string }> = {
  key: "jobmaterial-create",
  type: "perform",
  resource: "jobmaterial",
  title: "Create Job Material",
  description: "Add a line item to a Job's Quote/Invoice. Returns only the new UUID.",
  idempotent: false,
  params: [
    { key: "jobUuid", label: "Job UUID", type: "string" },
    { key: "name", label: "Item name", type: "string" },
    {
      key: "quantity",
      label: "Quantity",
      type: "string",
      required: true,
      hint: 'Required by the API. A numeric string, e.g. "1" or "2.5".',
    },
    { key: "price", label: "Unit price (ex-tax)", type: "string" },
  ],
  output: [{ key: "uuid", type: "string", label: "New Job Material UUID (x-record-uuid)" }],

  async execute(input, ctx) {
    const { uuid } = await new ServiceM8Client(ctx).create(
      "/jobmaterial.json",
      compact({
        job_uuid: input.jobUuid,
        name: input.name,
        quantity: input.quantity,
        price: input.price,
      }),
    );
    return { uuid };
  },
};

export default jobMaterialCreate;
