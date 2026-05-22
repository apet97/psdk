# ErrorT

Pumble returns one of two error body shapes; clients should be prepared
to parse either. See the parent operation description for context.



## Supported Types

### `errors.LegacyError`

```typescript
const value: errors.LegacyError = {
  error: "Could not find channel with that identifier",
};
```

### `errors.StructuredError`

```typescript
const value: errors.StructuredError = {
  message: "[Allowed values are PUBLIC|PRIVATE]",
  localizedMessage: "[Allowed values are PUBLIC|PRIVATE]",
  code: 400000,
};
```

