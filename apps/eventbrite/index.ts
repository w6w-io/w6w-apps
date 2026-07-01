import type { AppDefinition } from "@w6w/types";
import personalToken from "./auth/personal-token.ts";
import oauth2 from "./auth/oauth2.ts";
import listOrganizations from "./actions/list-organizations.ts";
import listOrganizers from "./actions/list-organizers.ts";
import getOrganizer from "./actions/get-organizer.ts";
import listEvents from "./actions/list-events.ts";
import getEvent from "./actions/get-event.ts";
import listTicketClasses from "./actions/list-ticket-classes.ts";
import listOrders from "./actions/list-orders.ts";
import getOrder from "./actions/get-order.ts";
import listAttendees from "./actions/list-attendees.ts";
import getAttendee from "./actions/get-attendee.ts";

export default {
  actions: [
    listOrganizations,
    listOrganizers,
    getOrganizer,
    listEvents,
    getEvent,
    listTicketClasses,
    listOrders,
    getOrder,
    listAttendees,
    getAttendee,
  ],
  auth: [personalToken, oauth2],
} satisfies AppDefinition;
