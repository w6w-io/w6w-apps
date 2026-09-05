import type { Param } from "@w6w/types";

export const workspaceId: Param = {
  key: "workspaceId",
  label: "Workspace ID",
  type: "string",
  hint: "Run List Workspaces to find an id. Falls back to the workspace recorded when this " +
    "connection was authorized, where one was.",
};

export const serviceIdRequired: Param = {
  key: "serviceId",
  label: "Service ID",
  type: "string",
  required: true,
  hint: "Run List Services to find an id.",
};

export const staffId: Param = {
  key: "staffId",
  label: "Staff ID",
  type: "string",
  hint: "Run List Staff to find an id.",
};

export const bookingId: Param = {
  key: "bookingId",
  label: "Booking ID",
  type: "string",
  required: true,
  hint: 'The id Book Appointment returns, e.g. "#AN-00014".',
};

/** What every appointment endpoint (book/get/update/reschedule) answers with. */
export const appointmentOutput = [
  { key: "booking_id", type: "string" as const, label: "Booking ID" },
  { key: "status", type: "string" as const, label: "Status" },
  { key: "service_name", type: "string" as const, label: "Service name" },
  { key: "staff_name", type: "string" as const, label: "Staff name" },
  { key: "start_time", type: "string" as const, label: "Start time" },
  { key: "end_time", type: "string" as const, label: "End time" },
  { key: "workspace_id", type: "string" as const, label: "Workspace ID" },
  { key: "summary_url", type: "string" as const, label: "Customer summary URL" },
];
