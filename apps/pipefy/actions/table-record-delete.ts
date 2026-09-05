import type { ActionDefinition } from "@w6w/types";
import { expectSuccess, gqlInput, PipefyClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/** `deleteTableRecord(input: {id}) { success }` — Pipefy's own reference example. */
const buildQuery = (id: string) =>
  `mutation { deleteTableRecord(input: ${gqlInput({ id })}) { success } }`;

const tableRecordDelete: ActionDefinition<Input> = {
  key: "table-record-delete",
  type: "perform",
  resource: "table-record",
  title: "Delete Table Record",
  description: "Permanently delete a Database Table record.",
  idempotent: true,
  params: [
    { key: "id", label: "Record ID", type: "string", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Whether the record was deleted" }],

  async execute(input, ctx) {
    const data = await new PipefyClient(ctx).send<Record<string, unknown>>(
      buildQuery(input.id),
    );
    const { success } = expectSuccess<{ success: boolean }>(data, "deleteTableRecord");
    return { success };
  },
};

export default tableRecordDelete;
