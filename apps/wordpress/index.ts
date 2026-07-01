import type { AppDefinition } from "@w6w/types";
import basic from "./auth/basic.ts";
import oauth2 from "./auth/oauth2.ts";
import postCreate from "./actions/post-create.ts";
import postGet from "./actions/post-get.ts";
import postGetAll from "./actions/post-get-all.ts";
import postUpdate from "./actions/post-update.ts";
import postDelete from "./actions/post-delete.ts";
import pageCreate from "./actions/page-create.ts";
import pageGet from "./actions/page-get.ts";
import pageGetAll from "./actions/page-get-all.ts";
import pageUpdate from "./actions/page-update.ts";
import pageDelete from "./actions/page-delete.ts";
import userCreate from "./actions/user-create.ts";
import userGet from "./actions/user-get.ts";
import userGetAll from "./actions/user-get-all.ts";
import userUpdate from "./actions/user-update.ts";
import userDelete from "./actions/user-delete.ts";

export default {
  actions: [
    postCreate,
    postGet,
    postGetAll,
    postUpdate,
    postDelete,
    pageCreate,
    pageGet,
    pageGetAll,
    pageUpdate,
    pageDelete,
    userCreate,
    userGet,
    userGetAll,
    userUpdate,
    userDelete,
  ],
  auth: [basic, oauth2],
} satisfies AppDefinition;
