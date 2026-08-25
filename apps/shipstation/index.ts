/**
 * ShipStation — order fulfillment, rating, and label purchasing across every
 * carrier connected to a ShipStation account. Built entirely against ShipStation's
 * current **V2** API (`api.shipstation.com`); see `lib/client.ts` for why the
 * deprecated V1 API and the beta Sales Order API are both out of scope.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";

import service from "./health/service.ts";
import account from "./health/account.ts";
import quota from "./health/quota.ts";

import shipmentCreate from "./actions/shipment-create.ts";
import shipmentGet from "./actions/shipment-get.ts";
import shipmentList from "./actions/shipment-list.ts";
import shipmentUpdate from "./actions/shipment-update.ts";
import shipmentCancel from "./actions/shipment-cancel.ts";
import rateGet from "./actions/rate-get.ts";
import rateListForShipment from "./actions/rate-list-for-shipment.ts";
import labelCreate from "./actions/label-create.ts";
import labelGet from "./actions/label-get.ts";
import labelList from "./actions/label-list.ts";
import labelVoid from "./actions/label-void.ts";
import carrierList from "./actions/carrier-list.ts";
import carrierGet from "./actions/carrier-get.ts";
import warehouseList from "./actions/warehouse-list.ts";
import warehouseCreate from "./actions/warehouse-create.ts";
import tagCreate from "./actions/tag-create.ts";
import tagList from "./actions/tag-list.ts";
import shipmentTagAdd from "./actions/shipment-tag-add.ts";

const app: AppDefinition = {
  actions: [
    shipmentCreate,
    shipmentGet,
    shipmentList,
    shipmentUpdate,
    shipmentCancel,
    rateGet,
    rateListForShipment,
    labelCreate,
    labelGet,
    labelList,
    labelVoid,
    carrierList,
    carrierGet,
    warehouseList,
    warehouseCreate,
    tagCreate,
    tagList,
    shipmentTagAdd,
  ],
  auth: [apiKey],
  healthChecks: [service, account, quota],
};

export default app;
