import type { ActionDefinition } from "@w6w/types";
import {
  unwrapRecordResult,
  ZohoRecruitClient,
  type ZohoRecruitRecordResult,
} from "../lib/client.ts";
import { writeOutput } from "../lib/params.ts";

interface Input {
  parentId: string;
  module: string;
  title?: string;
  content: string;
}

/**
 * `POST /Notes` — attaches a Note to a record in another module. `Parent_Id`
 * and `se_module` (the parent record's id and its module API name) are
 * required alongside the note's own content.
 */
const noteCreate: ActionDefinition<Input, ZohoRecruitRecordResult> = {
  key: "note-create",
  type: "perform",
  resource: "note",
  title: "Create Note",
  description:
    "Attach a Note to a record in another module (Candidates, Job Openings, Clients, ...).",
  idempotent: false,
  params: [
    {
      key: "parentId",
      label: "Parent record ID",
      type: "string",
      required: true,
      hint: "The id of the record this Note attaches to.",
    },
    {
      key: "module",
      label: "Parent module",
      type: "string",
      required: true,
      placeholder: "Candidates",
      hint: "API name of the parent record's module.",
    },
    { key: "title", label: "Title", type: "string" },
    { key: "content", label: "Content", type: "text", required: true },
  ],
  output: writeOutput,

  execute(input, ctx) {
    return new ZohoRecruitClient(ctx)
      .request<{ data: ZohoRecruitRecordResult[] }>("/Notes", {
        method: "POST",
        body: {
          data: [{
            Note_Title: input.title,
            Note_Content: input.content,
            Parent_Id: input.parentId,
            se_module: input.module,
          }],
        },
      })
      .then(unwrapRecordResult);
  },
};

export default noteCreate;
