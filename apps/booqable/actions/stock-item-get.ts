import type { ActionDefinition } from "@w6w/types";
import { BooqableClient } from "../lib/client.ts";
import { includeParam } from "../lib/params.ts";

interface Input {
  stockItemId: string;
  include?: string;
}

/** `GET /stock_items/{id}` — verified against developers.booqable.com ("Fetch a stock_item"). */
const stockItemGet: ActionDefinition<Input> = {
  key: "stock-item-get",
  type: "read",
  resource: "stock-item",
  title: "Get Stock Item",
  description: "Fetch a single stock item by id.",
  params: [
    { key: "stockItemId", label: "Stock Item ID", type: "string", required: true },
    { ...includeParam, placeholder: "product,barcode,location" },
  ],
  output: [{ key: "data", type: "object", label: "The StockItem object" }],

  execute(input, ctx) {
    return new BooqableClient(ctx).request(`/stock_items/${input.stockItemId}`, {
      query: { include: input.include },
    });
  },
};

export default stockItemGet;
