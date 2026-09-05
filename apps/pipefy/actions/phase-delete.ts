import type { ActionDefinition } from "@w6w/types";
import { expectSuccess, gqlInput, PipefyClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/** `deletePhase(input: {id}) { success }` — Pipefy's own reference example. */
const buildQuery = (id: string) =>
  `mutation { deletePhase(input: ${gqlInput({ id })}) { success } }`;

const phaseDelete: ActionDefinition<Input> = {
  key: "phase-delete",
  type: "perform",
  resource: "phase",
  title: "Delete Phase",
  description: "Permanently delete a phase.",
  idempotent: true,
  params: [
    { key: "id", label: "Phase ID", type: "string", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Whether the phase was deleted" }],

  async execute(input, ctx) {
    const data = await new PipefyClient(ctx).send<Record<string, unknown>>(
      buildQuery(input.id),
    );
    const { success } = expectSuccess<{ success: boolean }>(data, "deletePhase");
    return { success };
  },
};

export default phaseDelete;
