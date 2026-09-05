import type { ActionDefinition } from "@w6w/types";
import { WiseClient } from "../lib/client.ts";

/**
 * `GET /rates` — current or historical exchange rates.
 *
 * With no `time`/`from`/`to`, answers the current rate for `source`/`target`
 * as a one-element array. `from`/`to`/`group` together return a history —
 * `group` (day/hour/minute) sets the sampling interval.
 */
interface Input {
  source?: string;
  target?: string;
  time?: string;
  from?: string;
  to?: string;
  group?: string;
}

const rateGet: ActionDefinition<Input> = {
  key: "rate-get",
  type: "search",
  resource: "rate",
  title: "Get Exchange Rate",
  description: "Get the current exchange rate, or a history, for a currency pair.",
  params: [
    { key: "source", label: "Source currency", type: "string", placeholder: "EUR" },
    { key: "target", label: "Target currency", type: "string", placeholder: "USD" },
    {
      key: "time",
      label: "At time",
      type: "datetime",
      hint: "Historic rate at this exact timestamp. Leave empty for the current rate.",
    },
    {
      key: "from",
      label: "History from",
      type: "datetime",
      hint: "Combine with 'History to' and 'Group by' for a rate history instead of one rate.",
    },
    { key: "to", label: "History to", type: "datetime" },
    {
      key: "group",
      label: "Group by",
      type: "select",
      options: [
        { value: "day", label: "Day" },
        { value: "hour", label: "Hour" },
        { value: "minute", label: "Minute" },
      ],
      hint: "Sampling interval for a history request.",
    },
  ],
  output: [{ key: "items", type: "array", label: "Rate readings" }],

  async execute(input, ctx) {
    const items = await new WiseClient(ctx).json<unknown[]>("/rates", {
      query: {
        source: input.source,
        target: input.target,
        time: input.time,
        from: input.from,
        to: input.to,
        group: input.group,
      },
    });
    return { items: items ?? [] };
  },
};

export default rateGet;
