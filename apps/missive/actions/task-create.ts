import type { ActionDefinition } from "@w6w/types";
import { compact, MissiveClient, toIdList } from "../lib/client.ts";

interface Input {
  title: string;
  description?: string;
  state?: "todo" | "in_progress" | "closed";
  organization?: string;
  team?: string;
  assignees?: string;
  dueAt?: number;
  subtask?: boolean;
  conversation?: string;
  references?: string;
  conversationSubject?: string;
  addUsers?: string;
  addToInbox?: boolean;
}

/**
 * `POST /v1/tasks` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Tasks, 2026-08-29.
 *
 * A **standalone** task needs Team ID or Assignees (Organization ID is
 * required alongside either). A **subtask** needs Subtask enabled plus either
 * Conversation ID or References to locate/create the parent conversation.
 * Tasks created via the API show up in the Tasks view only — never the Inbox
 * — and creating one does not auto-watch its parent conversation.
 */
const action: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description:
    "Create a standalone task (needs Team ID or Assignees) or a conversation subtask (needs " +
    "Subtask + Conversation ID or References). Created tasks appear only in the Tasks view.",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true, hint: "Max 1000 characters." },
    {
      key: "description",
      label: "Description",
      type: "text",
      default: "",
      hint: "Max 10000 characters.",
    },
    {
      key: "state",
      label: "State",
      type: "select",
      default: "todo",
      advanced: true,
      options: [
        { value: "todo", label: "To Do" },
        { value: "in_progress", label: "In Progress" },
        { value: "closed", label: "Closed" },
      ],
    },
    {
      key: "organization",
      label: "Organization ID",
      type: "string",
      default: "",
      hint: "Required when using Team, Assignees, or Add Users.",
    },
    {
      key: "team",
      label: "Team ID",
      type: "string",
      default: "",
      hint: "Standalone task: Team or Assignees is required.",
    },
    {
      key: "assignees",
      label: "Assignees (comma-separated IDs)",
      type: "string",
      default: "",
      hint: "Standalone task: Team or Assignees is required.",
    },
    { key: "dueAt", label: "Due At (Unix timestamp)", type: "number", default: 0 },
    {
      key: "subtask",
      label: "Subtask Of A Conversation",
      type: "boolean",
      default: false,
      advanced: true,
    },
    {
      key: "conversation",
      label: "Parent Conversation ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "Required when Subtask is enabled (unless using References).",
    },
    {
      key: "references",
      label: "References (comma-separated Message-IDs)",
      type: "string",
      default: "",
      advanced: true,
      hint: "Alternative to Parent Conversation ID for locating/creating the parent, when " +
        "Subtask is enabled.",
    },
    {
      key: "conversationSubject",
      label: "New Conversation Subject",
      type: "string",
      default: "",
      advanced: true,
      hint: "Used only when References creates a new conversation.",
    },
    {
      key: "addUsers",
      label: "Add Users To Parent (comma-separated IDs, subtasks only)",
      type: "string",
      default: "",
      advanced: true,
    },
    {
      key: "addToInbox",
      label: "Move Parent To Inbox (subtasks only)",
      type: "boolean",
      default: false,
      advanced: true,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "state", type: "string", label: "State" },
  ],

  async execute(input, ctx) {
    if (!input.title) throw new Error("`title` is required");
    if (input.subtask && !input.conversation && !input.references) {
      throw new Error("`conversation` or `references` is required when `subtask` is true");
    }
    if (!input.subtask && !input.team && !toIdList(input.assignees).length) {
      throw new Error("`team` or `assignees` is required for a standalone task");
    }

    const task = compact({
      title: input.title,
      description: input.description,
      state: input.state,
      organization: input.organization,
      team: input.team,
      assignees: toIdList(input.assignees).length ? toIdList(input.assignees) : undefined,
      due_at: input.dueAt || undefined,
      subtask: input.subtask === true ? true : undefined,
      conversation: input.conversation,
      references: toIdList(input.references).length ? toIdList(input.references) : undefined,
      conversation_subject: input.conversationSubject,
      add_users: toIdList(input.addUsers).length ? toIdList(input.addUsers) : undefined,
      add_to_inbox: input.addToInbox === true ? true : undefined,
    });

    ctx.log("info", "creating Missive task", {
      title: input.title,
      subtask: input.subtask === true,
    });
    const res = await new MissiveClient(ctx).json<{ tasks: unknown }>("/tasks", {
      method: "POST",
      body: { tasks: task },
    });
    return res.tasks;
  },
};

export default action;
