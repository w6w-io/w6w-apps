import type { ActionDefinition } from "@w6w/types";
import { expectSuccess, gqlInput, PipefyClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/** `deletePipe(input: {id}) { success }` — Pipefy's own reference example. */
const buildQuery = (id: string) =>
  `mutation { deletePipe(input: ${gqlInput({ id })}) { success } }`;

const pipeDelete: ActionDefinition<Input> = {
  key: "pipe-delete",
  type: "perform",
  resource: "pipe",
  title: "Delete Pipe",
  description: "Permanently delete a pipe.",
  idempotent: true,
  params: [
    { key: "id", label: "Pipe ID", type: "string", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Whether the pipe was deleted" }],

  async execute(input, ctx) {
    const data = await new PipefyClient(ctx).send<Record<string, unknown>>(
      buildQuery(input.id),
    );
    const { success } = expectSuccess<{ success: boolean }>(data, "deletePipe");
    return { success };
  },
};

export default pipeDelete;
