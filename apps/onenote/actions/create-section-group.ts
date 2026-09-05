import type { ActionDefinition } from "@w6w/types";
import { containerBase, GraphClient } from "../lib/client.ts";
import {
  containerParams,
  displayNameParam,
  locationParams,
  sectionGroupOutput,
} from "../lib/params.ts";

interface Input {
  location?: string;
  locationId?: string;
  notebookId?: string;
  sectionGroupId?: string;
  displayName: string;
}

/**
 * `POST .../onenote/notebooks/{id}/sectionGroups` · `POST .../onenote/sectionGroups/{id}/sectionGroups`
 *
 * https://learn.microsoft.com/en-us/graph/api/notebook-post-sectiongroups
 * https://learn.microsoft.com/en-us/graph/api/sectiongroup-post-sectiongroups
 *
 * There is no flat "create a section group with no parent" endpoint — the
 * reference documents only these two container-scoped forms — so exactly one
 * of Notebook ID / Section Group ID must be set. (Setting Section Group ID
 * nests the new group one level deeper, inside that parent.)
 *
 * The `sectionGroup` resource's own Methods table documents Get / Create
 * section group / List section groups / Create section / List sections — no
 * rename/update, no delete — so this App offers none.
 *
 * Section group names must be unique within the same hierarchy level and may
 * not exceed 50 characters or contain `?* / :<>|'"` (no space in the real character set — split here only so this block comment can contain it).
 *
 * Least privileged delegated permission: `Notes.Create`. Returns `201
 * Created` and the new `sectionGroup` object. Supported for both
 * work-or-school and personal Microsoft accounts.
 */
const createSectionGroup: ActionDefinition<Input> = {
  key: "create-section-group",
  type: "perform",
  resource: "section-group",
  title: "Create Section Group",
  description:
    "Create a new OneNote section group directly under a notebook, or nested under another section group.",
  // Every call mints a new section group with a new id; Graph rejects a
  // duplicate name outright rather than converging on one, so a retry is not
  // safe.
  idempotent: false,
  params: [
    ...locationParams(),
    ...containerParams({ forCreate: true }),
    displayNameParam(
      "The section group's name. Must be unique at this level; up to 50 characters; cannot contain `?*/:<>|'\"`.",
    ),
  ],
  output: sectionGroupOutput,

  async execute(input, ctx) {
    if (!input.notebookId?.trim() && !input.sectionGroupId?.trim()) {
      throw new Error(
        "Set Notebook ID or Section Group ID — a section group needs exactly one parent.",
      );
    }
    const client = new GraphClient(ctx);
    return await client.request(containerBase(input, "sectionGroups"), {
      method: "POST",
      body: { displayName: input.displayName },
    });
  },
};

export default createSectionGroup;
