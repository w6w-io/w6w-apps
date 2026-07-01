import type { AppDefinition } from "@w6w/types";

import privateAppToken from "./auth/private-app-token.ts";
import apiKey from "./auth/api-key.ts";
import oauth2 from "./auth/oauth2.ts";

// Contact
import createContact from "./actions/create-contact.ts";
import upsertContact from "./actions/upsert-contact.ts";
import getContact from "./actions/get-contact.ts";
import listContacts from "./actions/list-contacts.ts";
import updateContact from "./actions/update-contact.ts";
import deleteContact from "./actions/delete-contact.ts";
import searchContacts from "./actions/search-contacts.ts";
import batchCreateContacts from "./actions/batch-create-contacts.ts";
import batchUpdateContacts from "./actions/batch-update-contacts.ts";
import batchDeleteContacts from "./actions/batch-delete-contacts.ts";

// Company
import createCompany from "./actions/create-company.ts";
import getCompany from "./actions/get-company.ts";
import listCompanies from "./actions/list-companies.ts";
import updateCompany from "./actions/update-company.ts";
import deleteCompany from "./actions/delete-company.ts";
import searchCompanies from "./actions/search-companies.ts";

// Deal
import createDeal from "./actions/create-deal.ts";
import getDeal from "./actions/get-deal.ts";
import listDeals from "./actions/list-deals.ts";
import updateDeal from "./actions/update-deal.ts";
import deleteDeal from "./actions/delete-deal.ts";
import searchDeals from "./actions/search-deals.ts";

// Ticket
import createTicket from "./actions/create-ticket.ts";
import getTicket from "./actions/get-ticket.ts";
import listTickets from "./actions/list-tickets.ts";
import updateTicket from "./actions/update-ticket.ts";
import deleteTicket from "./actions/delete-ticket.ts";
import searchTickets from "./actions/search-tickets.ts";

// Association
import createAssociation from "./actions/create-association.ts";
import deleteAssociation from "./actions/delete-association.ts";

// Engagement
import createNote from "./actions/create-note.ts";
import createTask from "./actions/create-task.ts";
import createCall from "./actions/create-call.ts";
import createEmail from "./actions/create-email.ts";
import createMeeting from "./actions/create-meeting.ts";

// List
import listLists from "./actions/list-lists.ts";
import getList from "./actions/get-list.ts";
import addContactToList from "./actions/add-contact-to-list.ts";
import removeContactFromList from "./actions/remove-contact-from-list.ts";

// Owner
import listOwners from "./actions/list-owners.ts";

// Form
import listForms from "./actions/list-forms.ts";
import submitForm from "./actions/submit-form.ts";

export default {
  auth: [privateAppToken, oauth2, apiKey],
  actions: [
    // contact
    createContact,
    upsertContact,
    getContact,
    listContacts,
    updateContact,
    deleteContact,
    searchContacts,
    batchCreateContacts,
    batchUpdateContacts,
    batchDeleteContacts,
    // company
    createCompany,
    getCompany,
    listCompanies,
    updateCompany,
    deleteCompany,
    searchCompanies,
    // deal
    createDeal,
    getDeal,
    listDeals,
    updateDeal,
    deleteDeal,
    searchDeals,
    // ticket
    createTicket,
    getTicket,
    listTickets,
    updateTicket,
    deleteTicket,
    searchTickets,
    // association
    createAssociation,
    deleteAssociation,
    // engagement
    createNote,
    createTask,
    createCall,
    createEmail,
    createMeeting,
    // list
    listLists,
    getList,
    addContactToList,
    removeContactFromList,
    // owner
    listOwners,
    // form
    listForms,
    submitForm,
  ],
} satisfies AppDefinition;
