# ScheduledMessageRecurrence

## Example Usage

```typescript
import { ScheduledMessageRecurrence } from "pumble-keys-sdk/models";

let value: ScheduledMessageRecurrence = {
  recurrenceType: "WEEKLY",
  endAfterOccurrences: 10,
  endDate: 1893459600000,
};
```

## Fields

| Field                                                 | Type                                                  | Required                                              | Description                                           | Example                                               |
| ----------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| `recurrenceType`                                      | [models.RecurrenceType](../models/recurrence-type.md) | :heavy_check_mark:                                    | N/A                                                   | WEEKLY                                                |
| `endAfterOccurrences`                                 | *number*                                              | :heavy_minus_sign:                                    | N/A                                                   | 10                                                    |
| `endDate`                                             | *number*                                              | :heavy_minus_sign:                                    | Epoch-ms after which the recurrence stops.            | 1893459600000                                         |