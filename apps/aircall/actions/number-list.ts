import type { ActionDefinition } from "@w6w/types";
import { AircallClient } from "../lib/client.ts";
import {
  listOutput,
  listResult,
  type PaginationInput,
  paginationParams,
  paginationQuery,
  type WindowInput,
  windowParams,
  windowQuery,
} from "../lib/params.ts";

type Input = PaginationInput & WindowInput;

/**
 * `GET /v1/numbers` — the company's phone Numbers.
 *
 * **Two fields on a Number are documented as no longer trustworthy**, and both
 * look authoritative:
 *
 *  - `open` — "Deprecated. This field is no longer updated for Smartflows
 *    numbers and may return outdated or incorrect values." Availability now
 *    comes from the Smartflows Time Rule widget.
 *  - `is_ivr` — "Deprecated. This field is no longer supported and may return
 *    outdated or incorrect value", because an IVR is configured in the
 *    Smartflows Editor for any number.
 *
 * `availability_status` (`open` / `custom` / `closed`) is derived from the first
 * Time Rule widget in the flow and is the field to read instead of `open` — with
 * the caveat that Aircall calls the underlying *setting* deprecated too.
 *
 * The full `messages` object of nine music-and-message URLs comes back on every
 * row, so a wide page is a large payload.
 */
const numberList: ActionDefinition<Input> = {
  key: "number-list",
  type: "read",
  resource: "number",
  title: "List Numbers",
  description:
    "List the company's phone Numbers. Read availability_status, not the deprecated `open` and " +
    "`is_ivr` fields, which Aircall no longer updates for Smartflows numbers.",
  params: [...windowParams("Numbers"), ...paginationParams()],
  output: listOutput,

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    const { meta, items } = await client.list<Record<string, unknown>>("/numbers", "numbers", {
      query: { ...windowQuery(input), ...paginationQuery(input) },
    });
    return listResult(meta, items);
  },
};

export default numberList;
