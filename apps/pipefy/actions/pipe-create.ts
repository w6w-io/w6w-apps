import type { ActionDefinition } from "@w6w/types";
import { gqlInput, PipefyClient } from "../lib/client.ts";

interface Input {
  organizationId: string;
  name: string;
}

/**
 * `createPipe(input: {name, organization_id}) { pipe { id name } }`.
 * Confirmed both in Pipefy's own reference (which shows the mutation but
 * only selects `clientMutationId` on its result) and independently in
 * Pipefy's own open-source Terraform provider
 * (`internal/pipefy/pipe.go`'s `createPipeMutation`), which selects
 * `pipe { id name }` on the same mutation — that's the shape used here.
 *
 * `createPipe` accepts only a name and an organization; every other pipe
 * setting (color, visibility, …) is a follow-up `pipe-update`.
 */
function buildQuery(input: Record<string, unknown>): string {
  return `mutation { createPipe(input: ${gqlInput(input)}) { pipe { id name } } }`;
}

const pipeCreate: ActionDefinition<Input> = {
  key: "pipe-create",
  type: "perform",
  resource: "pipe",
  title: "Create Pipe",
  description: "Create a pipe in an organization. Set everything else with a follow-up update.",
  idempotent: false,
  params: [
    { key: "organizationId", label: "Organization ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
  ],
  output: [{ key: "pipe", type: "object", label: "The created pipe" }],

  async execute(input, ctx) {
    const data = await new PipefyClient(ctx).send<{ createPipe: { pipe: unknown } }>(
      buildQuery({ name: input.name, organization_id: input.organizationId }),
    );
    return data.createPipe.pipe;
  },
};

export default pipeCreate;
