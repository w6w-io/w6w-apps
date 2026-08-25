import type { ActionDefinition } from "@w6w/types";
import { compact, SendblueClient } from "../lib/client.ts";

interface Input {
  groupId: string;
  modifyType: "add_recipient" | "remove_recipient";
  number: string;
  fromNumber?: string;
}

/**
 * `POST /api/modify-group` — add/remove a participant from an existing
 * iMessage group (beta). Two documented gotchas: removal requires the group
 * to already have at least 4 total members, and success is reported only
 * after the device-side membership change is verified — this is not a
 * fire-and-forget request.
 */
const groupModify: ActionDefinition<Input> = {
  key: "group-modify",
  type: "perform",
  resource: "group",
  title: "Modify Group",
  description: "Add or remove an external participant from an existing iMessage group (beta).",
  idempotent: false,
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true },
    {
      key: "modifyType",
      label: "Action",
      type: "select",
      required: true,
      options: [{ value: "add_recipient", label: "Add recipient" }, {
        value: "remove_recipient",
        label: "Remove recipient",
      }],
    },
    {
      key: "number",
      label: "Number to add/remove",
      type: "string",
      required: true,
      hint: "E.164 or an iMessage email handle. Company-owned lines cannot be added/removed.",
    },
    {
      key: "fromNumber",
      label: "Sendblue line to act from",
      type: "string",
      hint: "Required on Free API accounts. Optional when exactly one of your lines is already " +
        "in the group.",
    },
  ],
  output: [
    { key: "group_id", type: "string", label: "Group ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.post(
      "/api/modify-group",
      compact({
        group_id: input.groupId,
        modify_type: input.modifyType,
        number: input.number,
        from_number: input.fromNumber,
      }),
    );
  },
};

export default groupModify;
