import type { ActionDefinition } from "@w6w/types";
import { containerBase, GraphClient } from "../lib/client.ts";
import { containerParams, displayNameParam, locationParams, sectionOutput } from "../lib/params.ts";

interface Input {
  location?: string;
  locationId?: string;
  notebookId?: string;
  sectionGroupId?: string;
  displayName: string;
}

/**
 * `POST .../onenote/notebooks/{id}/sections` · `POST .../onenote/sectionGroups/{id}/sections`
 *
 * https://learn.microsoft.com/en-us/graph/api/notebook-post-sections
 * https://learn.microsoft.com/en-us/graph/api/sectiongroup-post-sections
 *
 * There is no flat "create a section with no parent" endpoint — the reference
 * documents only these two container-scoped forms — so exactly one of
 * Notebook ID / Section Group ID must be set.
 *
 * The `onenoteSection` resource's own Methods table documents Get / Create
 * page / List pages / Copy to notebook / Copy to section group — no
 * rename/update, no delete — so this App offers none.
 *
 * Section names must be unique within the same hierarchy level and may not
 * exceed 50 characters or contain `?* / :<>|'"` (no space in the real character set — split here only so this block comment can contain it).
 *
 * Least privileged delegated permission: `Notes.Create`. Returns `201
 * Created` and the new `onenoteSection` object. Supported for both
 * work-or-school and personal Microsoft accounts.
 */
const createSection: ActionDefinition<Input> = {
  key: "create-section",
  type: "perform",
  resource: "section",
  title: "Create Section",
  description: "Create a new OneNote section directly under a notebook or a section group.",
  // Every call mints a new section with a new id; Graph rejects a duplicate
  // name outright rather than converging on one, so a retry is not safe.
  idempotent: false,
  params: [
    ...locationParams(),
    ...containerParams({ forCreate: true }),
    displayNameParam(
      "The section's name. Must be unique at this level; up to 50 characters; cannot contain `?*/:<>|'\"`.",
    ),
  ],
  output: sectionOutput,

  async execute(input, ctx) {
    if (!input.notebookId?.trim() && !input.sectionGroupId?.trim()) {
      throw new Error("Set Notebook ID or Section Group ID — a section needs exactly one parent.");
    }
    const client = new GraphClient(ctx);
    return await client.request(containerBase(input, "sections"), {
      method: "POST",
      body: { displayName: input.displayName },
    });
  },
};

export default createSection;
