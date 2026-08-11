import type { ActionDefinition } from "@w6w/types";
import { HarvestClient } from "../lib/client.ts";
import { noteVisibilityWriteOptions } from "../lib/params.ts";

/**
 * `POST /v3/notes` — write a note onto a candidate.
 *
 * ## Three creatable types out of thirteen readable ones
 *
 * `GET /v3/notes` returns thirteen `type` values, but only `NOTE`, `ACTIVITY`
 * and `EMAIL` may be created here — the rest (`INTERVIEW`, `FEEDBACK`,
 * `TOUCHPOINT`, `LINKEDIN_INMAIL`, …) are produced by Greenhouse features and
 * are read-only through the API. The select below offers exactly the three.
 *
 * ## Visibility is spelled differently than it is read
 *
 * Creating requires `public | private | admin_only`. Reading returns
 * `publicly_visible | privately_visible | admin_only_visible`. Copying a value
 * out of a `list-notes` result straight into this action is a 422 — see
 * `lib/params.ts`, where the two option lists are kept deliberately apart.
 *
 * ## `EMAIL` has its own required fields, and they are forbidden on the others
 *
 * The vendor's schema makes this conditional: when `note_type` is `EMAIL`,
 * `subject`, `email_from`, `email_to` and `email_cc` are all required — `email_cc`
 * may be an empty array but must be present — and when it is anything else those
 * same four fields are rejected outright. This action enforces both directions
 * locally, because the failure is otherwise a 422 whose message names a field the
 * form did not obviously ask for.
 */
interface Input {
  candidateId: number;
  noteType?: string;
  body: string;
  visibility?: string;
  subject?: string;
  applicationId?: number;
  userId?: number;
  emailFrom?: string;
  emailTo?: string;
  emailCc?: string;
}

function addresses(raw: string | undefined): string[] {
  return (raw ?? "").split(",").map((a) => a.trim()).filter(Boolean);
}

const createNote: ActionDefinition<Input> = {
  key: "create-note",
  type: "perform",
  resource: "candidate",
  title: "Create Note",
  description: "Post a note, an activity-feed entry, or a logged e-mail onto a candidate.",
  idempotent: false,
  params: [
    {
      key: "candidateId",
      label: "Candidate id",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "noteType",
      label: "Type",
      type: "select",
      default: "NOTE",
      options: [
        { value: "NOTE", label: "Note — posted in the candidate's Notes tab" },
        { value: "ACTIVITY", label: "Activity — a free-form activity-feed entry" },
        { value: "EMAIL", label: "E-mail — logs an e-mail into the activity feed" },
      ],
      hint: "Only these three of Greenhouse's thirteen note types can be created through the " +
        "API; the rest are produced by Greenhouse itself.",
    },
    {
      key: "body",
      label: "Body",
      type: "text",
      required: true,
      hint: "Newlines are stored verbatim and render as line breaks in Greenhouse.",
    },
    {
      key: "visibility",
      label: "Visibility",
      type: "select",
      required: true,
      default: "public",
      options: noteVisibilityWriteOptions,
      hint: "These are the CREATE spellings. A value copied out of List Notes " +
        "(`publicly_visible` and friends) is rejected.",
    },
    {
      key: "subject",
      label: "Subject",
      type: "string",
      hint: "Required when the type is E-mail; optional otherwise.",
    },
    {
      key: "applicationId",
      label: "Application id",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Anchors the note to one application, which must belong to the candidate above. " +
        "Omit for a candidate-level note.",
    },
    {
      key: "userId",
      label: "Author user id",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Records someone else as the author. Defaults to the user this connection acts as.",
    },
    {
      key: "emailFrom",
      label: "E-mail: From",
      type: "string",
      showIf: { "==": [{ var: "noteType" }, "EMAIL"] },
      hint: "Comma-separated. Required for an e-mail note, rejected on the other types.",
    },
    {
      key: "emailTo",
      label: "E-mail: To",
      type: "string",
      showIf: { "==": [{ var: "noteType" }, "EMAIL"] },
      hint: "Comma-separated. Required for an e-mail note, rejected on the other types.",
    },
    {
      key: "emailCc",
      label: "E-mail: Cc",
      type: "string",
      showIf: { "==": [{ var: "noteType" }, "EMAIL"] },
      hint: "Comma-separated. Must be PRESENT for an e-mail note but may be empty.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Note id" },
    { key: "candidate_id", type: "number", label: "Candidate id" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  execute(input, ctx) {
    const noteType = input.noteType ?? "NOTE";
    const body: Record<string, unknown> = {
      candidate_id: input.candidateId,
      body: input.body,
      note_type: noteType,
      visibility: input.visibility ?? "public",
    };
    if (input.applicationId) body.application_id = input.applicationId;
    if (input.userId) body.user_id = input.userId;

    if (noteType === "EMAIL") {
      if (!input.subject) throw new Error("An e-mail note requires a subject.");
      const from = addresses(input.emailFrom);
      const to = addresses(input.emailTo);
      if (from.length === 0 || to.length === 0) {
        throw new Error("An e-mail note requires both From and To addresses.");
      }
      body.subject = input.subject;
      body.email_from = from;
      body.email_to = to;
      // Required but permitted to be empty — Greenhouse rejects its absence, not
      // its emptiness.
      body.email_cc = addresses(input.emailCc);
    } else {
      if (input.emailFrom || input.emailTo || input.emailCc) {
        throw new Error(
          `Greenhouse rejects the e-mail fields on a ${noteType} note — they are only accepted ` +
            "when the type is EMAIL. Clear them or switch the type.",
        );
      }
      if (input.subject) body.subject = input.subject;
    }

    return new HarvestClient(ctx).json("/notes", { method: "POST", body });
  },
};

export default createNote;
