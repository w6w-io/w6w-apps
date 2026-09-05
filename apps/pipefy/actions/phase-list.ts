import type { ActionDefinition } from "@w6w/types";
import { gqlLiteral, PHASE_FIELDS, PipefyClient } from "../lib/client.ts";

interface Input {
  pipeId: string;
}

/**
 * `{ pipe(id) { phases { ...PHASE_FIELDS } } }` — the "All Phase's Fields"
 * shape from Pipefy's Fields doc, without the nested field selection (use
 * `phase-get` for a single phase's fields).
 */
const buildQuery = (pipeId: string) =>
  `{ pipe(id: ${gqlLiteral(pipeId)}) { phases { ${PHASE_FIELDS} } } }`;

const phaseList: ActionDefinition<Input> = {
  key: "phase-list",
  type: "read",
  resource: "phase",
  title: "List Phases",
  description: "List every phase of a pipe, in order.",
  params: [
    { key: "pipeId", label: "Pipe ID", type: "string", required: true },
  ],
  output: [{ key: "phases", type: "array", label: "Phases" }],

  async execute(input, ctx) {
    const data = await new PipefyClient(ctx).send<{ pipe: { phases: unknown[] } | null }>(
      buildQuery(input.pipeId),
    );
    if (!data.pipe) throw new Error("Pipefy returned no pipe");
    return { phases: data.pipe.phases };
  },
};

export default phaseList;
