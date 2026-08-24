import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import listContacts from "./actions/list-contacts.ts";
import getContact from "./actions/get-contact.ts";
import createContact from "./actions/create-contact.ts";
import updateContact from "./actions/update-contact.ts";
import deleteContact from "./actions/delete-contact.ts";

import listTasks from "./actions/list-tasks.ts";
import createTask from "./actions/create-task.ts";
import updateTask from "./actions/update-task.ts";
import deleteTask from "./actions/delete-task.ts";

import listEvents from "./actions/list-events.ts";
import createEvent from "./actions/create-event.ts";
import updateEvent from "./actions/update-event.ts";
import deleteEvent from "./actions/delete-event.ts";

import listOpportunities from "./actions/list-opportunities.ts";
import createOpportunity from "./actions/create-opportunity.ts";
import updateOpportunity from "./actions/update-opportunity.ts";
import deleteOpportunity from "./actions/delete-opportunity.ts";

import listNotes from "./actions/list-notes.ts";
import createNote from "./actions/create-note.ts";

import listUsers from "./actions/list-users.ts";
import listCustomFields from "./actions/list-custom-fields.ts";

import service from "./health/service.ts";

export default {
  actions: [
    // Contact
    listContacts,
    getContact,
    createContact,
    updateContact,
    deleteContact,
    // Task
    listTasks,
    createTask,
    updateTask,
    deleteTask,
    // Event
    listEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    // Opportunity
    listOpportunities,
    createOpportunity,
    updateOpportunity,
    deleteOpportunity,
    // Note
    listNotes,
    createNote,
    // Account metadata
    listUsers,
    listCustomFields,
  ],
  auth: [apiKey],
  healthChecks: [service],
} satisfies AppDefinition;
