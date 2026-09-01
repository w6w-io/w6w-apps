import type { AppDefinition } from "@w6w/types";
import basic from "./auth/basic.ts";
import listBookings from "./actions/list-bookings.ts";
import getBooking from "./actions/get-booking.ts";
import createBooking from "./actions/create-booking.ts";
import updateBooking from "./actions/update-booking.ts";
import deleteBooking from "./actions/delete-booking.ts";
import listProfiles from "./actions/list-profiles.ts";
import getProfile from "./actions/get-profile.ts";
import createAppointmentType from "./actions/create-appointment-type.ts";
import createTeamMember from "./actions/create-team-member.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // booking
    listBookings,
    getBooking,
    createBooking,
    updateBooking,
    deleteBooking,
    // profile (booking page)
    listProfiles,
    getProfile,
    // appointment type
    createAppointmentType,
    // team member
    createTeamMember,
  ],
  auth: [basic],
  healthChecks: [service, quota],
} satisfies AppDefinition;
