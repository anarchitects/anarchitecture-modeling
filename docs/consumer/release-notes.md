# Release notes and compatibility history

Neither package has an authorized public release yet. Candidate versions in local
archives are preview metadata, not evidence of npm availability. No deprecation,
end-of-maintenance date or stable 1.x support commitment is announced.

## First-release candidate scope

- **modeling-core:** identities, format-2 semantic models, structured values,
  containment/local references, independent view data and structural diagnostics.
- **modeling-metamodel:** exact pack/profile composition, semantic and notation
  checks, bounded defaults/commands, guarded document sessions and envelope-1
  serialization. The runtime dependency on core is exact and independently versioned.

The [API reference](api.md), [consumer guide](README.md) and
[migration procedure](migration.md) describe these candidate contracts and their
limits. Preview documentation adds no runtime functionality. Metamodel does not
provide licensed method packs, a renderer or persistence implementation.

When a release becomes available, its package/version-specific notes must identify
the exact compatible core pair, observable changes, format/peer/runtime impact,
known limitations and any consumer upgrade actions. Preserve older version notes
and artifact documentation. No changelog entry alone proves a release exists.
