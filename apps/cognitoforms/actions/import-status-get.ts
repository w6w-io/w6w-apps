import type { ActionDefinition } from "@w6w/types";
import { CognitoFormsClient } from "../lib/client.ts";

interface Input {
  formId: string;
  importId: string;
}

/**
 * GET /forms/{formId}/import-status/{importId} — poll a bulk import kicked off by Import Entries.
 * Requires `Form:Read`.
 */
const importStatusGet: ActionDefinition<Input> = {
  key: "import-status-get",
  type: "read",
  resource: "entry",
  title: "Get Import Status",
  description: "Check the progress and result of a bulk entry import.",
  params: [
    {
      key: "formId",
      label: "Form ID",
      type: "string",
      required: true,
      hint: "Get IDs from Get Many Forms.",
    },
    {
      key: "importId",
      label: "Import ID",
      type: "string",
      required: true,
      hint: "Returned by Import Entries.",
    },
  ],
  output: [
    { key: "Id", type: "string", label: "Import ID" },
    { key: "Status", type: "string", label: "Import status" },
    { key: "ErrorMessage", type: "string", label: "Failure reason, if any" },
    { key: "SuccessfulEntries", type: "number", label: "Entries imported successfully" },
    { key: "UnsuccessfulEntries", type: "number", label: "Entries that failed to import" },
    { key: "TotalEntries", type: "number", label: "Total entries in the file" },
    { key: "ImportLink", type: "string", label: "Link to download the annotated file" },
  ],

  async execute(input, ctx) {
    return await new CognitoFormsClient(ctx).request(
      `/forms/${encodeURIComponent(input.formId)}/import-status/${
        encodeURIComponent(input.importId)
      }`,
    );
  },
};

export default importStatusGet;
