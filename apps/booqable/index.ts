import type { AppDefinition } from "@w6w/types";

import accessToken from "./auth/access-token.ts";

import customerList from "./actions/customer-list.ts";
import customerSearch from "./actions/customer-search.ts";
import customerGet from "./actions/customer-get.ts";
import customerCreate from "./actions/customer-create.ts";
import customerUpdate from "./actions/customer-update.ts";
import customerArchive from "./actions/customer-archive.ts";

import productGroupList from "./actions/product-group-list.ts";
import productGroupGet from "./actions/product-group-get.ts";
import productGroupCreate from "./actions/product-group-create.ts";
import productGroupUpdate from "./actions/product-group-update.ts";

import productList from "./actions/product-list.ts";
import productSearch from "./actions/product-search.ts";
import productGet from "./actions/product-get.ts";
import productCreate from "./actions/product-create.ts";
import productUpdate from "./actions/product-update.ts";
import productArchive from "./actions/product-archive.ts";

import orderList from "./actions/order-list.ts";
import orderSearch from "./actions/order-search.ts";
import orderGet from "./actions/order-get.ts";
import orderCreate from "./actions/order-create.ts";
import orderUpdate from "./actions/order-update.ts";
import orderStatusTransition from "./actions/order-status-transition.ts";

import stockItemList from "./actions/stock-item-list.ts";
import stockItemGet from "./actions/stock-item-get.ts";

import planningList from "./actions/planning-list.ts";
import planningGet from "./actions/planning-get.ts";

import service from "./health/service.ts";
import companyDomain from "./health/company-domain.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    customerList,
    customerSearch,
    customerGet,
    customerCreate,
    customerUpdate,
    customerArchive,
    productGroupList,
    productGroupGet,
    productGroupCreate,
    productGroupUpdate,
    productList,
    productSearch,
    productGet,
    productCreate,
    productUpdate,
    productArchive,
    orderList,
    orderSearch,
    orderGet,
    orderCreate,
    orderUpdate,
    orderStatusTransition,
    stockItemList,
    stockItemGet,
    planningList,
    planningGet,
  ],
  auth: [accessToken],
  healthChecks: [service, companyDomain, quota],
} satisfies AppDefinition;
