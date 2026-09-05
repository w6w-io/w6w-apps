import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient, toList } from "../lib/client.ts";

/**
 * `PUT /v0/webhooks` — register a webhook for one Heartbeat community event.
 *
 * `trigger` is a discriminated union in Heartbeat's schema (`name` picks one
 * of 11 shapes, most carrying their own `filter` object). This action exposes
 * every filter field the union defines and builds the correct nested shape
 * for whichever `name` is chosen, dropping the fields that do not apply to it
 * — rather than exposing 11 separate actions for what is, on the wire, one
 * endpoint.
 *
 * Heartbeat documents no idempotency key for this endpoint (unlike, say,
 * Apify's webhook-create), so a retry after a dropped response creates a
 * second, duplicate webhook rather than returning the first.
 */
interface Input {
  action:
    | "USER_JOIN"
    | "USER_UPDATE"
    | "GROUP_JOIN"
    | "ABANDONED_CART"
    | "THREAD_CREATE"
    | "MENTION"
    | "DIRECT_MESSAGE"
    | "COURSE_COMPLETED"
    | "EVENT_CREATE"
    | "EVENT_RSVP"
    | "DOCUMENT_CREATE";
  url: string;
  // MENTION
  mentionUserSelection?: Array<{ id: string; type: "USER" | "GROUP" }>;
  mentionChannelIDs?: string[] | string;
  // THREAD_CREATE
  threadChannelID?: string;
  threadTriggerOnMove?: boolean;
  // GROUP_JOIN
  groupID?: string;
  // COURSE_COMPLETED
  courseID?: string;
  // DIRECT_MESSAGE
  directMessageUserID?: string;
  // EVENT_RSVP
  eventRsvpUserType?: "HEARTBEAT_USER" | "GUEST";
  eventRsvpEventID?: string;
  // ABANDONED_CART
  abandonedInvitationLinkID?: string;
  abandonedGroupIDs?: string[] | string;
}

function filterFor(input: Input): Record<string, unknown> | undefined {
  switch (input.action) {
    case "MENTION":
      return {
        userSelection: input.mentionUserSelection ?? [],
        ...(input.mentionChannelIDs ? { channelIDs: toList(input.mentionChannelIDs) } : {}),
      };
    case "THREAD_CREATE":
      return {
        channelID: input.threadChannelID,
        ...(input.threadTriggerOnMove !== undefined
          ? { triggerOnMove: input.threadTriggerOnMove }
          : {}),
      };
    case "GROUP_JOIN":
      return { groupID: input.groupID };
    case "COURSE_COMPLETED":
      return { courseID: input.courseID };
    case "DIRECT_MESSAGE":
      return { userID: input.directMessageUserID };
    case "EVENT_RSVP": {
      const f: Record<string, unknown> = {};
      if (input.eventRsvpUserType) f.userType = input.eventRsvpUserType;
      if (input.eventRsvpEventID) f.eventID = input.eventRsvpEventID;
      return f;
    }
    case "ABANDONED_CART": {
      const f: Record<string, unknown> = {};
      if (input.abandonedInvitationLinkID) f.invitationLinkID = input.abandonedInvitationLinkID;
      const groupIDs = toList(input.abandonedGroupIDs);
      if (groupIDs) f.groupIDs = groupIDs;
      return f;
    }
    default:
      // USER_JOIN, USER_UPDATE, EVENT_CREATE, DOCUMENT_CREATE take no filter.
      return undefined;
  }
}

const createWebhook: ActionDefinition<Input> = {
  key: "create-webhook",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Register a webhook that fires on one Heartbeat community event.",
  idempotent: false,
  params: [
    {
      key: "action",
      label: "Event",
      type: "select",
      required: true,
      options: [
        { value: "USER_JOIN", label: "User joined" },
        { value: "USER_UPDATE", label: "User profile updated" },
        { value: "GROUP_JOIN", label: "User joined a group" },
        { value: "ABANDONED_CART", label: "Abandoned invitation link" },
        { value: "THREAD_CREATE", label: "Thread created" },
        { value: "MENTION", label: "User or group mentioned" },
        { value: "DIRECT_MESSAGE", label: "Direct message received" },
        { value: "COURSE_COMPLETED", label: "Course completed" },
        { value: "EVENT_CREATE", label: "Event created" },
        { value: "EVENT_RSVP", label: "Event RSVP" },
        { value: "DOCUMENT_CREATE", label: "Document created" },
      ],
    },
    { key: "url", label: "Target URL", type: "string", required: true },
    {
      key: "mentionUserSelection",
      label: "Mention: users/groups to watch",
      type: "array",
      item: {
        type: "object",
        fields: [
          { key: "id", label: "User or group ID", type: "string", required: true },
          {
            key: "type",
            label: "Type",
            type: "select",
            required: true,
            options: [{ value: "USER", label: "User" }, { value: "GROUP", label: "Group" }],
          },
        ],
      },
      hint: 'Only used when Event is "User or group mentioned".',
    },
    {
      key: "mentionChannelIDs",
      label: "Mention: restrict to channel IDs",
      type: "multiselect",
      hint: 'Only used when Event is "User or group mentioned". Leave empty for every channel.',
    },
    {
      key: "threadChannelID",
      label: "Thread create: channel ID",
      type: "string",
      hint: 'Only used when Event is "Thread created".',
    },
    {
      key: "threadTriggerOnMove",
      label: "Thread create: also fire when a thread is moved in",
      type: "boolean",
      hint: 'Only used when Event is "Thread created".',
    },
    {
      key: "groupID",
      label: "Group join: group ID",
      type: "string",
      hint: 'Only used when Event is "User joined a group".',
    },
    {
      key: "courseID",
      label: "Course completed: course ID",
      type: "string",
      hint: 'Only used when Event is "Course completed".',
    },
    {
      key: "directMessageUserID",
      label: "Direct message: user ID",
      type: "string",
      hint: 'Only used when Event is "Direct message received".',
    },
    {
      key: "eventRsvpUserType",
      label: "Event RSVP: attendee type filter",
      type: "select",
      options: [
        { value: "HEARTBEAT_USER", label: "Heartbeat user" },
        { value: "GUEST", label: "Guest" },
      ],
      hint: 'Only used when Event is "Event RSVP".',
    },
    {
      key: "eventRsvpEventID",
      label: "Event RSVP: event ID filter",
      type: "string",
      hint: 'Only used when Event is "Event RSVP".',
    },
    {
      key: "abandonedInvitationLinkID",
      label: "Abandoned link: invitation link ID",
      type: "string",
      hint: 'Only used when Event is "Abandoned invitation link".',
    },
    {
      key: "abandonedGroupIDs",
      label: "Abandoned link: restrict to group IDs",
      type: "multiselect",
      hint: 'Only used when Event is "Abandoned invitation link".',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "url", type: "string", label: "Target URL" },
    { key: "trigger", type: "object", label: "The registered trigger" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],

  execute(input, ctx) {
    const filter = filterFor(input);
    const trigger = filter && Object.keys(filter).length > 0
      ? { name: input.action, filter }
      : { name: input.action };
    return new HeartbeatClient(ctx).json("/webhooks", {
      method: "PUT",
      body: { action: trigger, url: input.url },
    });
  },
};

export default createWebhook;
