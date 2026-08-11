import type { ActionDefinition } from "@w6w/types";
import { FirefliesClient } from "../lib/client.ts";

interface Input {
  meetingId: string;
  prompt: string;
}

const MUTATION = `
  mutation CreateLiveActionItem($input: CreateLiveActionItemInput!) {
    createLiveActionItem(input: $input) {
      success
    }
  }
`;

const liveActionItemCreate: ActionDefinition<Input> = {
  key: "live-action-item-create",
  type: "perform",
  resource: "live-meeting",
  title: "Create Live Action Item",
  description:
    "Ask Fred to file an action item during a meeting that is still running, from a natural-language prompt.",
  // Fred interprets the prompt afresh each call, so a retry files a second item.
  idempotent: false,
  params: [
    {
      key: "meetingId",
      label: "Meeting ID",
      type: "string",
      required: true,
      hint: "From `active-meeting-list`.",
    },
    {
      key: "prompt",
      label: "Prompt",
      type: "text",
      required: true,
      config: { multiline: true },
      validation: { minLength: 5, maxLength: 255 },
      hint: 'Plain language, e.g. "Follow up with the client about the proposal".',
    },
  ],
  output: [
    { key: "createLiveActionItem.success", type: "boolean", label: "Created" },
  ],

  execute(input, ctx) {
    // Rate limited to 10 per hour, and it spends AI credits — an account
    // without them fails with `require_ai_credits`.
    return new FirefliesClient(ctx).query(MUTATION, {
      input: { meeting_id: input.meetingId, prompt: input.prompt },
    });
  },
};

export default liveActionItemCreate;
