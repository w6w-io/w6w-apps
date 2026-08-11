import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, stripSecrets } from "../lib/client.ts";

/**
 * `POST /v2/datasets` — create a dataset, or fetch the existing one by that
 * name.
 *
 * ## Naming changes the semantics entirely
 *
 * With a `name`, this is **get-or-create**: the vendor's words are "It creates a
 * dataset with the given name if the parameter name is used. If a dataset with
 * the given name already exists then returns its object." Calling it twice with
 * the same name is safe and gives you the same dataset.
 *
 * Without a `name`, every call creates a *new, unnamed* dataset. So this action
 * declares `idempotent: false` — the honest reading of the endpoint as a whole,
 * since idempotency here is a property of the caller's input rather than of the
 * endpoint. Supply a name if a retry must not leave debris.
 *
 * The other consequence of naming: unnamed datasets expire with the plan's data
 * retention period, and named ones are kept indefinitely. Unnamed ones are also
 * hidden from List Datasets unless unnamed storages are explicitly included.
 *
 * `urlSigningSecretKey` is stripped from the response for the same reason as in
 * Get Dataset.
 */
interface Input {
  name?: string;
}

const datasetCreate: ActionDefinition<Input> = {
  key: "dataset-create",
  type: "perform",
  resource: "dataset",
  title: "Create Dataset",
  description:
    "Create a dataset. With a name this is get-or-create; without one it creates a new unnamed " +
    "dataset every time.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      hint:
        "Strongly recommended. A named dataset is returned as-is if it already exists, is kept " +
        "indefinitely, and shows up in List Datasets. An unnamed one is created fresh each " +
        "call, expires with your plan's retention period, and is hidden from the default list.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Dataset ID" },
    { key: "name", type: "string", label: "Name, if one was given" },
    { key: "createdAt", type: "string", label: "Creation time" },
  ],

  async execute(input, ctx) {
    const dataset = await new ApifyClient(ctx).data<Record<string, unknown>>("/datasets", {
      method: "POST",
      query: { name: input.name },
    });
    return stripSecrets(dataset);
  },
};

export default datasetCreate;
