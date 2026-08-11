import type { ActionDefinition } from "@w6w/types";
import { encodeId, HarvestClient } from "../lib/client.ts";
import { emailTypeOptions, phoneTypeOptions } from "../lib/params.ts";

/**
 * `PATCH /v3/candidates/{id}` — edit a person.
 *
 * Only the keys present in the body are touched; omitted keys are left alone.
 * That is what makes this safe to retry and why it is marked idempotent: sending
 * the same patch twice leaves the same end state.
 *
 * ## The collection fields REPLACE, they do not append
 *
 * `email_addresses`, `phone_numbers`, `addresses`, `website_addresses` and
 * `tags` are whole-collection fields. Sending one e-mail address does not add an
 * address — it makes that the candidate's only address, discarding the rest.
 * There is no "add one" endpoint for these on the candidate, so anything that
 * means to append has to read the current list first and send it back with the
 * addition. The params below say so, because silently deleting a candidate's
 * work e-mail is not a recoverable mistake.
 *
 * The remaining candidate-shaped writes v3 offers — educations, employments and
 * tag application — are their own sub-resources (`/v3/candidate_educations`,
 * `/v3/candidate_employments`, `/v3/applied_candidate_tags`) and are not
 * modelled by this app; see `README.md` for what is deliberately left out.
 */
interface Input {
  candidateId: number;
  firstName?: string;
  lastName?: string;
  preferredName?: string;
  company?: string;
  title?: string;
  isPrivate?: boolean;
  canEmail?: boolean;
  replaceEmailAddress?: string;
  emailType?: string;
  replacePhoneNumber?: string;
  phoneType?: string;
  replaceTags?: string;
}

const updateCandidate: ActionDefinition<Input> = {
  key: "update-candidate",
  type: "perform",
  resource: "candidate",
  title: "Update Candidate",
  description:
    "Patch a candidate's details. Contact-detail and tag fields replace the whole collection.",
  idempotent: true,
  params: [
    {
      key: "candidateId",
      label: "Candidate id",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    { key: "firstName", label: "First name", type: "string", row: "name" },
    { key: "lastName", label: "Last name", type: "string", row: "name" },
    { key: "preferredName", label: "Preferred name", type: "string" },
    { key: "company", label: "Current company", type: "string", row: "role" },
    { key: "title", label: "Current title", type: "string", row: "role" },
    {
      key: "isPrivate",
      label: "Private",
      type: "boolean",
      hint: "Restricts the candidate to users explicitly granted access.",
    },
    {
      key: "canEmail",
      label: "Can e-mail",
      type: "boolean",
      hint: "Turning this off stops Greenhouse sending the candidate templated e-mail.",
    },
    {
      key: "replaceEmailAddress",
      label: "Replace all e-mail addresses with",
      type: "string",
      row: "email",
      hint: "REPLACES the candidate's entire e-mail list with this one address. To add an " +
        "address, read the current list first and send it back with the addition.",
    },
    {
      key: "emailType",
      label: "E-mail type",
      type: "select",
      options: emailTypeOptions,
      row: "email",
    },
    {
      key: "replacePhoneNumber",
      label: "Replace all phone numbers with",
      type: "string",
      row: "phone",
      hint: "REPLACES the candidate's entire phone list with this one number.",
    },
    {
      key: "phoneType",
      label: "Phone type",
      type: "select",
      options: phoneTypeOptions,
      row: "phone",
    },
    {
      key: "replaceTags",
      label: "Replace all tags with",
      type: "string",
      hint: "Comma-separated. REPLACES the candidate's whole tag set — anything not listed here " +
        "is removed.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Candidate id" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],

  execute(input, ctx) {
    const body: Record<string, unknown> = {};
    if (input.firstName !== undefined) body.first_name = input.firstName;
    if (input.lastName !== undefined) body.last_name = input.lastName;
    if (input.preferredName !== undefined) body.preferred_name = input.preferredName;
    if (input.company !== undefined) body.company = input.company;
    if (input.title !== undefined) body.title = input.title;
    if (input.isPrivate !== undefined) body.is_private = input.isPrivate;
    if (input.canEmail !== undefined) body.can_email = input.canEmail;
    if (input.replaceEmailAddress) {
      body.email_addresses = [{
        value: input.replaceEmailAddress,
        type: input.emailType ?? "personal",
      }];
    }
    if (input.replacePhoneNumber) {
      body.phone_numbers = [{
        value: input.replacePhoneNumber,
        type: input.phoneType ?? "mobile",
      }];
    }
    if (input.replaceTags !== undefined) {
      body.tags = input.replaceTags.split(",").map((t) => t.trim()).filter(Boolean);
    }

    if (Object.keys(body).length === 0) {
      throw new Error("Nothing to update — fill in at least one field besides the candidate id.");
    }

    return new HarvestClient(ctx).json(`/candidates/${encodeId(input.candidateId)}`, {
      method: "PATCH",
      body,
    });
  },
};

export default updateCandidate;
