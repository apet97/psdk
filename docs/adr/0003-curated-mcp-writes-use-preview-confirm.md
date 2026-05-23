# Curated MCP writes use preview and confirm

Status: Accepted

## Context

Curated MCP is the agent-facing profile. It should be compact and safe to use,
especially for message writes where agents may otherwise act on ambiguous human
targets.

## Decision

Curated MCP writes use a preview and confirm flow. Preview tools resolve targets
and return a confirmation token; confirmed tools perform the generated SDK write
only when the request still matches the preview.

## Consequences

Direct curated write tools are not added for message send or thread reply.
Tests must keep destructive or raw generated write names out of the curated
surface, and write confirmation must happen before SDK calls.
