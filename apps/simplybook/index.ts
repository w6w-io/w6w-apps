import type { AppDefinition } from "@w6w/types";
import login from "./auth/login.ts";
import bookingGetMany from "./actions/booking-get-many.ts";
import bookingGet from "./actions/booking-get.ts";
import bookingCreate from "./actions/booking-create.ts";
import bookingUpdate from "./actions/booking-update.ts";
import bookingCancel from "./actions/booking-cancel.ts";
import bookingApprove from "./actions/booking-approve.ts";
import bookingDecline from "./actions/booking-decline.ts";
import clientGetMany from "./actions/client-get-many.ts";
import clientGet from "./actions/client-get.ts";
import clientCreate from "./actions/client-create.ts";
import serviceGetMany from "./actions/service-get-many.ts";
import providerGetMany from "./actions/provider-get-many.ts";
import locationGetMany from "./actions/location-get-many.ts";
import scheduleAvailableSlotsGetMany from "./actions/schedule-available-slots-get-many.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // booking
    bookingGetMany,
    bookingGet,
    bookingCreate,
    bookingUpdate,
    bookingCancel,
    bookingApprove,
    bookingDecline,
    // client
    clientGetMany,
    clientGet,
    clientCreate,
    // service
    serviceGetMany,
    // provider
    providerGetMany,
    // location
    locationGetMany,
    // schedule
    scheduleAvailableSlotsGetMany,
  ],
  auth: [login],
  healthChecks: [service, quota],
} satisfies AppDefinition;
