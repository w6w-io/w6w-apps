import type { Param } from "@w6w/types";

/**
 * Onfleet's webhook trigger vocabulary — verified against
 * `docs.onfleet.com/reference/webhooks`. IDs `11` and `21` are not documented
 * and are omitted; the rest are exactly as Onfleet lists them.
 */
export const WEBHOOK_TRIGGERS: Array<{ value: string; label: string }> = [
  { value: "0", label: "0 — taskStarted" },
  { value: "1", label: "1 — taskEta (needs `threshold` seconds)" },
  { value: "2", label: "2 — taskArrival (needs `threshold` meters)" },
  { value: "3", label: "3 — taskCompleted" },
  { value: "4", label: "4 — taskFailed" },
  { value: "5", label: "5 — workerDuty" },
  { value: "6", label: "6 — taskCreated" },
  { value: "7", label: "7 — taskUpdated" },
  { value: "8", label: "8 — taskDeleted" },
  { value: "9", label: "9 — taskAssigned" },
  { value: "10", label: "10 — taskUnassigned" },
  { value: "12", label: "12 — taskDelayed (needs `threshold` seconds)" },
  { value: "13", label: "13 — taskCloned" },
  { value: "14", label: "14 — smsRecipientResponseMissed" },
  { value: "15", label: "15 — workerCreated" },
  { value: "16", label: "16 — workerDeleted" },
  { value: "17", label: "17 — SMSRecipientOptOut" },
  { value: "18", label: "18 — autoDispatchJobCompleted" },
  { value: "19", label: "19 — taskBatchCreateJobCompleted" },
  { value: "20", label: "20 — routeOptimizationJobCompleted" },
  { value: "22", label: "22 — routePlanCreated" },
  { value: "23", label: "23 — routePlanStarted" },
  { value: "24", label: "24 — routePlanCompleted" },
  { value: "25", label: "25 — workerUpdated" },
  { value: "26", label: "26 — routePlanUpdated" },
  { value: "27", label: "27 — routePlanUnassigned" },
  { value: "28", label: "28 — routePlanAssigned" },
  { value: "29", label: "29 — routePlanDelayed" },
  { value: "30", label: "30 — predictedTaskDelay" },
];

export const triggerParam = (required: boolean): Param => ({
  key: "trigger",
  label: "Trigger",
  type: "select",
  required,
  ...(required ? {} : { default: "" }),
  options: WEBHOOK_TRIGGERS,
});
