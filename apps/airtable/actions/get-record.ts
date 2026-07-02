import type { ActionDefinition } from "@w6w/types";
import { AirtableClient } from "../lib/client.ts";

interface Input {
  baseId: string;
  table: string;
  recordId: string;
}

const getRecord: ActionDefinition<Input> = {
  key: "get-record",
  type: "read",
  resource: "record",
  title: "Get Record",
  description: "Retrieve a single record by ID.",
  params: [
    { key: "baseId", label: "Base ID", type: "string", required: true, placeholder: "appXXXXXXXXXXXXXX" },
    { key: "table", label: "Table (name or ID)", type: "string", required: true },
    { key: "recordId", label: "Record ID", type: "string", required: true, placeholder: "recXXXXXXXXXXXXXX" },
  ],

  async execute(input, ctx) {
    const client = new AirtableClient(ctx);
    return client.request(`${input.baseId}/${encodeURI(input.table)}/${input.recordId}`);
  },
};

export default getRecord;
