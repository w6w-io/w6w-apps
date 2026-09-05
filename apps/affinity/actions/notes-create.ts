import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, compact, toIdList } from "../lib/client.ts";

/**
 * `POST /notes`. At least one of `personIds`/`organizationIds`/
 * `opportunityIds`/`parentId` is required. When `parentId` is set, the note
 * becomes a reply and the entity ids are ignored by Affinity itself.
 */
interface Input {
  content: string;
  type?: number;
  personIds?: string;
  organizationIds?: string;
  opportunityIds?: string;
  parentId?: number;
  creatorId?: number;
}

const notesCreate: ActionDefinition<Input> = {
  key: "notes-create",
  type: "perform",
  resource: "note",
  title: "Create Note",
  description:
    "Create a note attached to a person, organization, or opportunity — or a reply to an " +
    "existing note (parent_id). At least one of person/organization/opportunity/parent must be " +
    "set.",
  idempotent: false,
  params: [
    { key: "content", label: "Content", type: "text", required: true },
    {
      key: "type",
      label: "Note type",
      type: "select",
      default: "0",
      options: [
        { value: "0", label: "Plain text" },
        { value: "2", label: "HTML" },
      ],
      hint: "HTML notes support <p>, <strong>, <em>, <u>, <ol>/<ul>+<li>, and background/font " +
        "color inline styles. <a> tags are not clickable in the Affinity web app.",
    },
    { key: "personIds", label: "Person IDs", type: "string", hint: "Comma-separated." },
    { key: "organizationIds", label: "Organization IDs", type: "string", hint: "Comma-separated." },
    { key: "opportunityIds", label: "Opportunity IDs", type: "string", hint: "Comma-separated." },
    {
      key: "parentId",
      label: "Reply to Note ID",
      type: "number",
      validation: { integer: true },
      hint: "Makes this a reply. person/organization/opportunity IDs are ignored when set.",
    },
    {
      key: "creatorId",
      label: "Creator (internal person ID)",
      type: "number",
      validation: { integer: true },
      hint: "Defaults to the owner of this API key.",
    },
  ],
  output: [{ key: "id", type: "number", label: "Note ID" }],

  execute(input, ctx) {
    const personIds = toIdList(input.personIds);
    const organizationIds = toIdList(input.organizationIds);
    const opportunityIds = toIdList(input.opportunityIds);
    if (!personIds && !organizationIds && !opportunityIds && !input.parentId) {
      throw new Error(
        "At least one of personIds, organizationIds, opportunityIds, or parentId is required",
      );
    }
    return new AffinityClient(ctx).json("/notes", {
      method: "POST",
      body: compact({
        content: input.content,
        type: input.type === undefined ? undefined : Number(input.type),
        person_ids: personIds,
        organization_ids: organizationIds,
        opportunity_ids: opportunityIds,
        parent_id: input.parentId,
        creator_id: input.creatorId,
      }),
    });
  },
};

export default notesCreate;
