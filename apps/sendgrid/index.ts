import type { AppDefinition } from "@w6w/types";
import contactUpsert from "./actions/contact-upsert.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactGet from "./actions/contact-get.ts";
import contactGetAll from "./actions/contact-get-all.ts";
import listCreate from "./actions/list-create.ts";
import listDelete from "./actions/list-delete.ts";
import listGet from "./actions/list-get.ts";
import listGetAll from "./actions/list-get-all.ts";
import listUpdate from "./actions/list-update.ts";
import mailSend from "./actions/mail-send.ts";
import sendGridApi from "./auth/send-grid-api.ts";

export default {
  actions: [contactUpsert, contactDelete, contactGet, contactGetAll, listCreate, listDelete, listGet, listGetAll, listUpdate, mailSend],
  auth: [sendGridApi],
} satisfies AppDefinition;
