# Generated SDK is regenerated

Status: Accepted

## Context

SDKP contains Speakeasy-generated endpoint, model, client, function, hook,
library, and raw MCP-tool files. These files are large, mechanical outputs and
are expected to change through regeneration.

## Decision

Generated SDK files are not hand-edited. Changes to generated behavior must
come from the source spec, generation configuration, or handwritten extensions
outside the generated directories.

## Consequences

Generated-directory diffs are treated as a guardrail failure during handwritten
architecture work. Stable product behavior belongs in small handwritten seams
around the generated SDK, not in patched generated files.
