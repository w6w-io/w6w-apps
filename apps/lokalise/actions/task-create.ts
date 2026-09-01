import type { ActionDefinition } from "@w6w/types";
import { asJson, asOptionalJson, compact, encodeId, LokaliseClient } from "../lib/client.ts";
import { projectIdParam } from "../lib/params.ts";

/**
 * `POST /projects/{project_id}/tasks` — create a translation task assigning
 * keys and languages to contributors, with an optional due date.
 *
 * `initial_tm_leverage` (how much of the task Lokalise's translation memory
 * can pre-fill) is calculated asynchronously after creation and is documented
 * to arrive empty in this call's own response — `task-list`/a later
 * `process-get`-style follow-up is where it shows up, not here.
 *
 * Not marked idempotent: every call creates a new task with a new id, with no
 * dedupe by title or content.
 */
interface Input {
  projectId: string;
  title: string;
  description?: string;
  dueDate?: string;
  keys?: unknown;
  languages: unknown;
  sourceLanguageIso?: string;
  taskType?: string;
  autoCloseTask?: boolean;
  autoCloseLanguages?: boolean;
  autoCloseItems?: boolean;
  doLockTranslations?: boolean;
}

const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a translation task, assigning keys and languages to contributors.",
  idempotent: false,
  params: [
    projectIdParam,
    { key: "title", label: "Title", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    {
      key: "dueDate",
      label: "Due date",
      type: "string",
      placeholder: "2024-12-31 12:00:00",
      hint: "Lokalise's own format: `YYYY-MM-DD HH:MM:SS`.",
    },
    {
      key: "keys",
      label: "Key IDs",
      type: "json",
      hint: "Array of numeric key ids to include, e.g. [11212,11241]. Omit to include every key.",
    },
    {
      key: "languages",
      label: "Languages",
      type: "json",
      required: true,
      hint: "Array of {language_iso, users?, groups?}, e.g. " +
        '[{"language_iso":"fi","users":[421]},{"language_iso":"ru","groups":[191]}].',
    },
    {
      key: "sourceLanguageIso",
      label: "Source language ISO",
      type: "string",
      hint: "Defaults to the project's base language.",
    },
    {
      key: "taskType",
      label: "Task type",
      type: "select",
      options: [
        { value: "translation", label: "Translation" },
        { value: "review", label: "Review" },
      ],
    },
    { key: "autoCloseTask", label: "Auto-close task when complete", type: "boolean" },
    { key: "autoCloseLanguages", label: "Auto-close each language when complete", type: "boolean" },
    { key: "autoCloseItems", label: "Auto-close each item when translated", type: "boolean" },
    { key: "doLockTranslations", label: "Lock translations while in this task", type: "boolean" },
  ],
  output: [
    { key: "task_id", type: "number", label: "New task ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new LokaliseClient(ctx).json(`/projects/${encodeId(input.projectId)}/tasks`, {
      method: "POST",
      body: compact({
        title: input.title,
        description: input.description,
        due_date: input.dueDate,
        keys: asOptionalJson(input.keys, "Key IDs"),
        languages: asJson(input.languages, "Languages"),
        source_language_iso: input.sourceLanguageIso,
        task_type: input.taskType,
        auto_close_task: input.autoCloseTask,
        auto_close_languages: input.autoCloseLanguages,
        auto_close_items: input.autoCloseItems,
        do_lock_translations: input.doLockTranslations,
      }),
    });
  },
};

export default taskCreate;
