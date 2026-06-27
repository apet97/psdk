# SDK Generator Product Boundary

`pumble-keys-sdk` is not the SDK generator product. It is a Pumble-specific TypeScript SDK / Developer Toolkit generated with Speakeasy.

If the company wants a Stainless/Speakeasy-like platform, build that as a separate product with:

- Arbitrary OpenAPI ingestion.
- Multi-language generation.
- Template customization.
- Customer API onboarding workflow.
- Hosted docs publishing.
- SDK governance and drift detection.
- Versioning and release automation.
- Contract test suites for generated SDKs.

Do not add these concerns to `pumble-keys-sdk` unless the repo is explicitly repurposed.
