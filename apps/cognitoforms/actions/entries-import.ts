import type { ActionDefinition } from "@w6w/types";
import { base64ToBytes, CognitoFormsClient } from "../lib/client.ts";

interface Input {
  formId: string;
  file: string;
  fileName?: string;
  importMode: string;
  email?: string;
  matchEntriesUsing?: string;
}

/**
 * POST /forms/{formId}/import-entries — bulk create, update or delete entries from an uploaded
 * `.xlsx`/`.csv` file. Returns an import ID; poll it with Get Import Status. Requires `Form:Read`
 * and `Entry:Read/Write/Delete`.
 */
const entriesImport: ActionDefinition<Input> = {
  key: "entries-import",
  type: "perform",
  resource: "entry",
  title: "Import Entries",
  description: "Bulk create, update or delete entries from an uploaded spreadsheet.",
  // Each call kicks off a distinct import job; retrying re-runs the whole file.
  idempotent: false,
  params: [
    {
      key: "formId",
      label: "Form ID",
      type: "string",
      required: true,
      hint: "Get IDs from Get Many Forms.",
    },
    {
      key: "file",
      label: "File (base64)",
      type: "text",
      required: true,
      hint: "Base64-encoded .xlsx or .csv file contents.",
    },
    { key: "fileName", label: "File name", type: "string", default: "import.csv" },
    {
      key: "importMode",
      label: "Import mode",
      type: "select",
      required: true,
      options: [
        { value: "CreateNew", label: "Create New" },
        { value: "UpdateExisting", label: "Update Existing" },
        { value: "SyncEntries", label: "Sync Entries (create, update and delete)" },
      ],
    },
    {
      key: "email",
      label: "Notification email",
      type: "string",
      hint: "Address to receive import completion notifications.",
    },
    {
      key: "matchEntriesUsing",
      label: "Match entries using",
      type: "string",
      hint: "An entry-ID substitute field, for UpdateExisting/SyncEntries when the file has no " +
        "entry ID column.",
    },
  ],
  output: [
    { key: "Id", type: "string", label: "Import ID" },
    { key: "Status", type: "string", label: "Import status" },
    { key: "ErrorMessage", type: "string", label: "Failure reason, if any" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "importing Cognito Forms entries", { formId: input.formId });
    const form = new FormData();
    form.append(
      "File",
      new Blob([base64ToBytes(input.file)]),
      input.fileName ?? "import.csv",
    );
    form.append("ImportMode", input.importMode);
    if (input.email) form.append("Email", input.email);
    if (input.matchEntriesUsing) form.append("MatchEntriesUsing", input.matchEntriesUsing);

    return await new CognitoFormsClient(ctx).request(
      `/forms/${encodeURIComponent(input.formId)}/import-entries`,
      { method: "POST", form },
    );
  },
};

export default entriesImport;
