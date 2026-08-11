import type { Option } from "@w6w/types";

/**
 * The webhook event vocabulary, transcribed verbatim from CompanyCam's Webhooks
 * guide (`docs.companycam.com/docs/webhooks-1`, fetched 2026-08-11).
 *
 * It is a closed list — the guide's table is the whole of it — and it is
 * hierarchical: `*` matches every event, `<resource>.*` matches every event of
 * one resource, and the rest are leaves.
 *
 * Two spellings to watch, both the vendor's:
 *
 *  - **`todo_list.*`** is the checklist family. Everywhere else in this API the
 *    resource is called a checklist; only the event names call it a todo list.
 *  - **`task.completed`** covers checklist tasks and, per the guide, "does not
 *    apply to Project Tasks" — a different feature with a similar name.
 *
 * There is no `photo.deleted`, no `user.*` and no `webhook.*` event. A workflow
 * that needs to know a photo went away cannot learn it from a webhook.
 */
export const webhookScopeOptions: Option[] = [
  { value: "*", label: "All events", description: "Matches every event." },
  { value: "project.*", label: "All project events" },
  { value: "project.created", label: "Project created" },
  { value: "project.updated", label: "Project updated" },
  { value: "project.label_added", label: "Project label added" },
  { value: "project.contact_created", label: "Project contact created" },
  { value: "project.contact_updated", label: "Project contact updated" },
  { value: "project.merged", label: "Project merged into another" },
  { value: "project.archived", label: "Project archived" },
  { value: "project.deleted", label: "Project deleted" },
  { value: "photo.*", label: "All photo events" },
  {
    value: "photo.created",
    label: "Photo created",
    description: "Fires once the photo has been processed, not when it is accepted.",
  },
  { value: "photo.updated", label: "Photo updated (annotations)" },
  { value: "photo.tag_added", label: "Photo tag added" },
  { value: "photo.description_updated", label: "Photo description created or updated" },
  { value: "comment.*", label: "All comment events" },
  { value: "comment.created", label: "Comment created" },
  { value: "document.*", label: "All document events" },
  { value: "document.created", label: "Document created" },
  { value: "document.updated", label: "Document updated" },
  { value: "video.*", label: "All video events" },
  { value: "video.created", label: "Video created" },
  {
    value: "video.updated",
    label: "Video updated",
    description: "The event to wait for before trusting playback_url.",
  },
  {
    value: "todo_list.*",
    label: "All checklist events",
    description: "Checklists are todo lists in event names.",
  },
  { value: "todo_list.created", label: "Checklist created" },
  { value: "todo_list.completed", label: "Checklist completed" },
  { value: "todo_list.deleted", label: "Checklist deleted" },
  { value: "task.*", label: "All checklist task events" },
  {
    value: "task.completed",
    label: "Checklist task completed",
    description: "Checklist tasks only — not Project Tasks.",
  },
];

/** Every documented scope value, for validation and tests. */
export const WEBHOOK_SCOPES: string[] = webhookScopeOptions.map((o) => String(o.value));
