import type { ActionDefinition } from "@w6w/types";
import { GET_BRANDS_PATH, sendyPostJson } from "../lib/client.ts";

interface SendyBrand {
  id?: string;
  name?: string;
}

/**
 * `POST /api/brands/get-brands.php` — every brand (id and name) in this
 * Sendy installation. Needs only `api_key`, which the `sign` hook supplies.
 */
const brandList: ActionDefinition<Record<string, never>> = {
  key: "brand-list",
  type: "read",
  resource: "brand",
  title: "Get Brands",
  description: "All brands in this Sendy installation.",
  params: [],
  output: [{ key: "brands", type: "array", label: "Brands" }],

  async execute(_input, ctx) {
    ctx.log("info", "reading brands", {});
    const brands = await sendyPostJson<SendyBrand[]>(ctx, GET_BRANDS_PATH, {});
    return { brands };
  },
};

export default brandList;
