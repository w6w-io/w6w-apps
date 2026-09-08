import type { ActionDefinition } from "@w6w/types";
import { JibbleClient, TIME_TRACKING_HOST } from "../lib/client.ts";

/**
 * `POST /v1/TimeEntries` with `type: "In"` — clock a person in.
 *
 * Not marked idempotent: the collection's examples show the caller may supply a client-side
 * `id`, but nothing in the documented responses confirms Jibble deduplicates a retried create
 * on that id rather than erroring or creating a second entry — so a retry is not proven safe.
 */
interface Input {
  personId: string;
  activityId?: string;
  projectId?: string;
  locationId?: string;
  note?: string;
  latitude?: number;
  longitude?: number;
}

const timeEntryClockIn: ActionDefinition<Input> = {
  key: "time-entry-clock-in",
  type: "perform",
  resource: "time-entry",
  title: "Clock In",
  description: "Clock a member in, optionally against an activity, project, or location.",
  idempotent: false,
  params: [
    { key: "personId", label: "Person ID", type: "string", required: true },
    { key: "activityId", label: "Activity ID", type: "string" },
    { key: "projectId", label: "Project ID", type: "string" },
    { key: "locationId", label: "Location ID", type: "string" },
    { key: "note", label: "Note", type: "text" },
    { key: "latitude", label: "Latitude", type: "number", row: "coordinates", advanced: true },
    { key: "longitude", label: "Longitude", type: "number", row: "coordinates", advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "Time entry ID" },
    { key: "time", type: "string", label: "Clock time (UTC)" },
  ],

  async execute(input, ctx) {
    if (!input.personId) throw new Error("personId is required");
    const hasCoordinates = input.latitude !== undefined && input.longitude !== undefined;
    return await new JibbleClient(ctx).json(TIME_TRACKING_HOST, "/v1/TimeEntries", {
      method: "POST",
      body: {
        personId: input.personId,
        type: "In",
        activityId: input.activityId || undefined,
        projectId: input.projectId || undefined,
        locationId: input.locationId || undefined,
        note: input.note || undefined,
        // "Web" is the only value the collection's own examples ever use; Jibble documents no
        // enum for this field, so this is the one confirmed-working value rather than a guess.
        clientType: "Web",
        ...(hasCoordinates
          ? { coordinates: { latitude: input.latitude, longitude: input.longitude } }
          : {}),
      },
    });
  },
};

export default timeEntryClockIn;
