import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the resource keys ("Box key", "Contact key",
 * …) that recur across almost every action, plus the vendor's own enums.
 */

export const pipelineKeyParam: Param = {
  key: "pipelineKey",
  label: "Pipeline Key",
  type: "string",
  required: true,
  hint: "The key of the pipeline, from Get a Pipeline or List Pipelines.",
};

export const boxKeyParam: Param = {
  key: "boxKey",
  label: "Box Key",
  type: "string",
  required: true,
  hint: "A box is Streak's term for one record (deal, applicant, ticket, …) inside a pipeline.",
};

export const stageKeyParam: Param = {
  key: "stageKey",
  label: "Stage Key",
  type: "string",
  required: true,
};

export const fieldKeyParam: Param = {
  key: "fieldKey",
  label: "Field Key",
  type: "string",
  required: true,
};

export const contactKeyParam: Param = {
  key: "contactKey",
  label: "Contact Key",
  type: "string",
  required: true,
};

export const organizationKeyParam: Param = {
  key: "organizationKey",
  label: "Organization Key",
  type: "string",
  required: true,
};

export const taskKeyParam: Param = {
  key: "taskKey",
  label: "Task Key",
  type: "string",
  required: true,
};

export const teamKeyParam: Param = {
  key: "teamKey",
  label: "Team Key",
  type: "string",
  required: true,
  hint: "From Get My Teams.",
};

export const userKeyParam: Param = {
  key: "userKey",
  label: "User Key",
  type: "string",
  required: true,
};

/**
 * The field types `create-a-field` documents as creatable: "Can be any of:
 * `TEXT_INPUT`, `DATE`, `TAG`, `FORMULA`, `DROPDOWN`, `CHECKBOX`, or
 * `TEAM_CONTACT`." `PERSON` appears on Streak's own built-in fields (e.g.
 * "Assigned To") but is never listed as a type a caller may create — so it is
 * deliberately absent from this list rather than guessed in.
 */
export const FIELD_TYPES = [
  "TEXT_INPUT",
  "DATE",
  "TAG",
  "FORMULA",
  "DROPDOWN",
  "CHECKBOX",
  "TEAM_CONTACT",
] as const;

export type FieldType = typeof FIELD_TYPES[number];

export const fieldTypeOptions = FIELD_TYPES.map((value) => ({ label: value, value }));
