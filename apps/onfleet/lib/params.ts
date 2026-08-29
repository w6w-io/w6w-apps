import type { Param } from "@w6w/types";

/** A destination, given inline as a JSON object or by an existing destination id. */
export const destinationParam = (required: boolean): Param => ({
  key: "destination",
  label: "Destination",
  type: "json",
  required,
  default: "",
  hint: 'An existing destination id, or an inline object: {"address":{"number":"...",' +
    '"street":"...","city":"...","country":"..."}}. See `destination-create` for the full shape.',
});

/** Zero-or-one recipients, given inline as JSON or by existing recipient id. */
export const recipientsParam: Param = {
  key: "recipients",
  label: "Recipients",
  type: "json",
  default: "",
  hint: "An array with zero or one recipient — either an id string or an inline object: " +
    '["<recipientId>"] or [{"name":"...","phone":"+1..."}].',
};

/** The container a task/route is assigned to at creation or reassignment time. */
export const containerParam: Param = {
  key: "container",
  label: "Container",
  type: "json",
  default: "",
  advanced: true,
  hint: 'Optional. Where the task is placed: {"type":"WORKER","worker":"<id>"}, ' +
    '{"type":"TEAM","team":"<id>"}, or {"type":"ORGANIZATION","organization":"<id>"}. ' +
    "Omitted, the task goes to the creating organization's own unassigned pool. Not allowed " +
    "together with `autoAssign`.",
};

/** A worker's vehicle, at creation or update time. */
export const vehicleParam: Param = {
  key: "vehicle",
  label: "Vehicle",
  type: "json",
  default: "",
  hint: 'Optional — omitted means on foot. {"type":"CAR","description":"...",' +
    '"licensePlate":"...","color":"..."}. `type` is one of CAR, MOTORCYCLE, BICYCLE, TRUCK.',
};

/** Comma-separated team ids, accepted as either a CSV string or a JSON array by the caller. */
export const teamsParam = (label = "Teams", hint = "Comma-separated team IDs."): Param => ({
  key: "teams",
  label,
  type: "string",
  default: "",
  hint,
});

/** The `{name, type, value}[]` metadata array most entities accept. */
export const metadataParam: Param = {
  key: "metadata",
  label: "Metadata",
  type: "json",
  default: "",
  advanced: true,
  hint: 'Optional. An array of {"name":"...","type":"boolean|number|string|object|array",' +
    '"value":...}. Up to 32 entries per entity.',
};
