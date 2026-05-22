# Contributing

Most SDK runtime files are generated from `../PumbleOpenApi.yaml`.
Do not patch generated `src/funcs`, `src/models`, `src/sdk`, `src/lib`,
`src/hooks`, or `src/mcp-server/tools` files directly unless there is no
spec or Speakeasy configuration fix available.

Hand-written code and tests live in:

- `src/extensions/`
- `bin/`
- `scripts/`
- `tests/`
- `docs/QUICKSTART.md`
- `examples/`
- `README.md`

Before opening a change, run the checks that match the surface you touched:

```bash
npm run build
npm test
npm run test:fixtures:scan
npm run test:pack
```

For OpenAPI or generator changes, also run:

```bash
speakeasy lint openapi -s ../PumbleOpenApi.yaml
speakeasy generate sdk -l typescript -s ../PumbleOpenApi.yaml -o . -y
npm run build
```
