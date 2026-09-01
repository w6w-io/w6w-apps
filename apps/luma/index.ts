import type { AppDefinition } from "@w6w/types";

import userGetSelf from "./actions/user-get-self.ts";
import calendarGet from "./actions/calendar-get.ts";
import calendarUpdate from "./actions/calendar-update.ts";
import calendarAdminsList from "./actions/calendar-admins-list.ts";
import calendarEventsList from "./actions/calendar-events-list.ts";
import calendarEventsLookup from "./actions/calendar-events-lookup.ts";
import calendarEventsAdd from "./actions/calendar-events-add.ts";
import calendarEventsApprove from "./actions/calendar-events-approve.ts";
import calendarEventsReject from "./actions/calendar-events-reject.ts";
import contactList from "./actions/contact-list.ts";
import eventGet from "./actions/event-get.ts";
import eventCreate from "./actions/event-create.ts";
import eventUpdate from "./actions/event-update.ts";
import eventCancelRequest from "./actions/event-cancel-request.ts";
import eventCancel from "./actions/event-cancel.ts";
import eventHostAdd from "./actions/event-host-add.ts";
import eventHostRemove from "./actions/event-host-remove.ts";
import eventHostUpdate from "./actions/event-host-update.ts";
import guestList from "./actions/guest-list.ts";
import guestGet from "./actions/guest-get.ts";
import guestAdd from "./actions/guest-add.ts";
import guestUpdateStatus from "./actions/guest-update-status.ts";
import guestUpdateTickets from "./actions/guest-update-tickets.ts";
import guestSendInvites from "./actions/guest-send-invites.ts";
import ticketTypeList from "./actions/ticket-type-list.ts";
import ticketTypeGet from "./actions/ticket-type-get.ts";
import ticketTypeCreate from "./actions/ticket-type-create.ts";
import ticketTypeUpdate from "./actions/ticket-type-update.ts";
import ticketTypeDelete from "./actions/ticket-type-delete.ts";

import apiKey from "./auth/api-key.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    userGetSelf,
    calendarGet,
    calendarUpdate,
    calendarAdminsList,
    calendarEventsList,
    calendarEventsLookup,
    calendarEventsAdd,
    calendarEventsApprove,
    calendarEventsReject,
    contactList,
    eventGet,
    eventCreate,
    eventUpdate,
    eventCancelRequest,
    eventCancel,
    eventHostAdd,
    eventHostRemove,
    eventHostUpdate,
    guestList,
    guestGet,
    guestAdd,
    guestUpdateStatus,
    guestUpdateTickets,
    guestSendInvites,
    ticketTypeList,
    ticketTypeGet,
    ticketTypeCreate,
    ticketTypeUpdate,
    ticketTypeDelete,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
