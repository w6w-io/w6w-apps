import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import serviceAccount from "./auth/service-account.ts";
import listCalendars from "./actions/list-calendars.ts";
import getAvailability from "./actions/get-availability.ts";
import createEvent from "./actions/create-event.ts";
import getEvent from "./actions/get-event.ts";
import listEvents from "./actions/list-events.ts";
import updateEvent from "./actions/update-event.ts";
import deleteEvent from "./actions/delete-event.ts";
import quickCreateEvent from "./actions/quick-create-event.ts";

export default {
  actions: [
    listCalendars,
    getAvailability,
    createEvent,
    getEvent,
    listEvents,
    updateEvent,
    deleteEvent,
    quickCreateEvent,
  ],
  auth: [oauth2, serviceAccount],
} satisfies AppDefinition;
