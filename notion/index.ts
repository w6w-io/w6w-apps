import type { AppDefinition } from "@w6w/types";
import internalSecret from "./auth/internal-secret.ts";
import oauth2 from "./auth/oauth2.ts";

import getDatabase from "./actions/get-database.ts";
import listDatabases from "./actions/list-databases.ts";
import searchDatabases from "./actions/search-databases.ts";
import getManyDatabases from "./actions/get-many-databases.ts";

import createDatabasePage from "./actions/create-database-page.ts";
import getDatabasePage from "./actions/get-database-page.ts";
import getManyDatabasePages from "./actions/get-many-database-pages.ts";
import updateDatabasePage from "./actions/update-database-page.ts";

import createPage from "./actions/create-page.ts";
import searchPages from "./actions/search-pages.ts";
import archivePage from "./actions/archive-page.ts";
import restorePage from "./actions/restore-page.ts";

import appendBlockChildren from "./actions/append-block-children.ts";
import getBlock from "./actions/get-block.ts";
import getManyBlocks from "./actions/get-many-blocks.ts";

import getUser from "./actions/get-user.ts";
import getManyUsers from "./actions/get-many-users.ts";

export default {
  actions: [
    // database
    getDatabase,
    listDatabases,
    searchDatabases,
    getManyDatabases,
    // databasePage
    createDatabasePage,
    getDatabasePage,
    getManyDatabasePages,
    updateDatabasePage,
    // page
    createPage,
    searchPages,
    archivePage,
    restorePage,
    // block
    appendBlockChildren,
    getBlock,
    getManyBlocks,
    // user
    getUser,
    getManyUsers,
  ],
  auth: [internalSecret, oauth2],
} satisfies AppDefinition;
