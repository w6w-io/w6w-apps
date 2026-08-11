import type { ActionDefinition } from "@w6w/types";
import { compact, MattermostClient } from "../lib/client.ts";

/**
 * `POST /api/v4/channels` — create a public or private channel.
 *
 * Four fields are required: `team_id`, `name`, `display_name` and `type`.
 *
 * `name` and `display_name` are not interchangeable. `name` is the **unique URL
 * handle** that appears in the channel's address and must be lowercase; every
 * other action's "channel name" means this one. `display_name` is the free-text
 * label people see and need not be unique.
 *
 * `type` is a single character — `O` for a public (open) channel, `P` for
 * private. It is offered as a select because "O" versus "P" is not guessable and
 * anything else is a 400.
 *
 * Not idempotent: a second create with the same `name` on the same team fails
 * with a store error rather than returning the existing channel.
 */
interface Input {
  teamId: string;
  name: string;
  displayName: string;
  type: string;
  purpose?: string;
  header?: string;
}

const channelCreate: ActionDefinition<Input> = {
  key: "channel-create",
  type: "perform",
  resource: "channel",
  title: "Create Channel",
  description: "Create a public or private channel on a team.",
  idempotent: false,
  params: [
    { key: "teamId", label: "Team ID", type: "string", required: true },
    {
      key: "name",
      label: "Name (URL handle)",
      type: "string",
      required: true,
      placeholder: "release-planning",
      validation: { pattern: "^[a-z0-9]+([a-z0-9_-]*[a-z0-9])?$" },
      hint: "Lowercase, unique within the team. This is what appears in the channel's URL.",
    },
    {
      key: "displayName",
      label: "Display name",
      type: "string",
      required: true,
      placeholder: "Release Planning",
      hint: "The label people see. Free text, need not be unique.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [
        { value: "O", label: "Public — anyone on the team can join" },
        { value: "P", label: "Private — invitation only" },
      ],
    },
    {
      key: "purpose",
      label: "Purpose",
      type: "string",
      hint: "A short description of what the channel is for.",
    },
    {
      key: "header",
      label: "Header",
      type: "text",
      hint: "Markdown shown in the channel header.",
    },
  ],
  output: [{ key: "id", type: "string", label: "The created channel's id" }],

  execute(input, ctx) {
    return new MattermostClient(ctx).request("/api/v4/channels", {
      method: "POST",
      body: compact({
        team_id: input.teamId,
        name: input.name,
        display_name: input.displayName,
        type: input.type,
        purpose: input.purpose,
        header: input.header,
      }),
    });
  },
};

export default channelCreate;
