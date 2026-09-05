import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import serviceAccount from "./auth/service-account.ts";

import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";
import userInsert from "./actions/user-insert.ts";
import userUpdate from "./actions/user-update.ts";
import userDelete from "./actions/user-delete.ts";

import groupList from "./actions/group-list.ts";
import groupGet from "./actions/group-get.ts";
import groupInsert from "./actions/group-insert.ts";
import groupUpdate from "./actions/group-update.ts";
import groupDelete from "./actions/group-delete.ts";

import memberList from "./actions/member-list.ts";
import memberInsert from "./actions/member-insert.ts";
import memberDelete from "./actions/member-delete.ts";

import orgunitList from "./actions/orgunit-list.ts";
import orgunitGet from "./actions/orgunit-get.ts";
import orgunitInsert from "./actions/orgunit-insert.ts";
import orgunitUpdate from "./actions/orgunit-update.ts";
import orgunitDelete from "./actions/orgunit-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    userList,
    userGet,
    userInsert,
    userUpdate,
    userDelete,

    groupList,
    groupGet,
    groupInsert,
    groupUpdate,
    groupDelete,

    memberList,
    memberInsert,
    memberDelete,

    orgunitList,
    orgunitGet,
    orgunitInsert,
    orgunitUpdate,
    orgunitDelete,
  ],
  auth: [oauth2, serviceAccount],
  healthChecks: [service, quota],
} satisfies AppDefinition;
