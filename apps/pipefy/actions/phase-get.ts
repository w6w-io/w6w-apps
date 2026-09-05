import type { ActionDefinition } from "@w6w/types";
import { gqlLiteral, PHASE_FIELDS, PipefyClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/** `{ phase(id) { ...PHASE_FIELDS, fields{id label} } }` — Pipefy's own reference. */
const buildQuery = (id: string) =>
  `{ phase(id: ${gqlLiteral(id)}) { ${PHASE_FIELDS} fields { id label } } }`;

const phaseGet: ActionDefinition<Input> = {
  key: "phase-get",
  type: "read",
  resource: "phase",
  title: "Get Phase",
  description: "Get a phase by ID, including its fields.",
  params: [
    { key: "id", label: "Phase ID", type: "string", required: true },
  ],
  output: [{ key: "phase", type: "object", label: "The phase" }],

  async execute(input, ctx) {
    const data = await new PipefyClient(ctx).send<{ phase: unknown }>(buildQuery(input.id));
    return data.phase;
  },
};

export default phaseGet;
