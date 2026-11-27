# Historical publication execution evidence

Both packages are published as `0.0.2`; `0.0.1` is the preceding verified
public release. The [publication record](https://github.com/anarchitects/anarchitecture-modeling/issues/23#issuecomment-7204975899)
records availability and exact archive identity. No deprecation, end-of-maintenance date or
stable 1.x support commitment is announced.

## 0.0.2 — 26 November 2026 — bounded semantic comparison (#77)

Install [core 0.0.2](https://www.npmjs.com/package/@anarchitects/modeling-core/v/0.0.2)
and [metamodel 0.0.2](https://www.npmjs.com/package/@anarchitects/modeling-metamodel/v/0.0.2):

```sh
npm install --save-exact @anarchitects/modeling-core@0.0.2 @anarchitects/modeling-metamodel@0.0.2
```

Both release tags and archives use source `fa82048545613c7f3dcc8b367af9bfc30ef6e448`.
Publication [run 45905753413](https://github.com/anarchitects/anarchitecture-modeling/actions/runs/45905753413)
succeeded through npm trusted publishing. SHA-256:

- Core: `34a09c2efb87a7338f53caccc53264885ec9f8707d58203396fe656b8c5c7c88`.
- Metamodel: `62955b7dc05cba8426543715896334c55fbc55ce7aff58bd628d01907cb5a0f5`.

Registry bytes match the approved preview. Fresh registry installation, public
runtime/type/lifecycle/comparator examples, lockfile reinstall, npm signatures
and both attestations passed. The immutable 0.0.2 README still labels comparison
“Unreleased” and retains prepublication wording; this source corrects that wording
without replacing published bytes or selecting another release.

Metamodel adds `compareDocumentSnapshots` and comparison contract 1 for trusted
snapshots. See the [contract, compatibility assessment and evidence](../proofs/semantic-comparison.md).
Nx selected `0.0.2` for both packages. The metamodel feature is compatible (a
patch increment under the zero-major policy); its core dependency is exactly
`0.0.2`. Core's runtime API, model format 2, metamodel contract 1 and document
envelope 1 remain unchanged. No existing data needs migration.
Published 0.0.1 readers cannot call this API; comparison reports are not persisted
in envelopes. A consumer must require a reviewed release containing the new export.
Implementation acceptance, #78 installed-consumer handoff, publication and adoption
remain separate.

## Development release-tooling alignment

Checked-in package versions were reconciled to the existing `0.0.1` releases.
Future release preparation applies Nx-calculated versions and changelogs to source
before review; distribution archives use those same versions. This does not
republish `0.0.1` or alter its artifacts/tags.
The private root workspace remains a development-only package. The subsequent
`0.0.2` release preparation applies this workflow to both packages.

## 0.0.1 — 20 November 2026

| Package            | Public version                                                                         | Compatible core |
| ------------------ | -------------------------------------------------------------------------------------- | --------------- |
| modeling-core      | [0.0.1 on npm](https://www.npmjs.com/package/@anarchitects/modeling-core/v/0.0.1)      | Not applicable  |
| modeling-metamodel | [0.0.1 on npm](https://www.npmjs.com/package/@anarchitects/modeling-metamodel/v/0.0.1) | Exactly `0.0.1` |

Install this verified pair in an independent Node 24 ESM consumer:

```sh
npm install --save-exact @anarchitects/modeling-core@0.0.1 @anarchitects/modeling-metamodel@0.0.1
```

These are the first official Foundation distributions. No earlier official
package requires migration. Application-local consumers still need their own
compatibility/cutover review; publication does not establish Archimatrix adoption.

### Public contracts and compatibility

- **modeling-core:** identities, format-2 semantic models, structured values,
  containment/local references, independent view data and structural diagnostics.
- **modeling-metamodel:** exact pack/profile composition, semantic and notation
  checks, bounded defaults/commands, guarded document sessions and envelope-1
  serialization. The runtime dependency on core is exact and independently versioned.

The [API reference](../consumer/api.md), [consumer guide](../consumer/README.md) and
[migration procedure](../consumer/migration.md) describe these contracts and their
limits. Metamodel does not
provide licensed method packs, a renderer or persistence implementation.

Supported evidence is Node 24 ESM, with TypeScript 6.0.3 strict NodeNext and
Node16 resolution. Node16 is a compiler mode, not Node 16 runtime support. There
is no CommonJS build or verified browser/bundler/Windows matrix. The model remains
format 2 and the portable document envelope remains format 1; publication adds
no migration or runtime behavior. Runtime dependencies are the exact core pair
and `tslib` (the clean proof resolved `2.9.1`, 0BSD), with no Nx or minimatch.
Both packages carry Apache-2.0 LICENSE and NOTICE files.

### Archive identity and provenance

Both archives and both `{projectName}@0.0.1` tags use source
`ed2d1c6aaa7409d46afd95ea6b5ffedf52b67047`. SHA-256 values:

- Core: `6c147dd0d300b7c9f01889274ef7a3bb38eed5f0cedad12bac0264e4c1f1888e`.
- Metamodel: `31b6e105e454eb5d84d839a2782e4ce7bea1735652e991d4f4956840d2751f2f`.

Core was published in [run 44709234090](https://github.com/anarchitects/anarchitecture-modeling/actions/runs/44709234090).
That attempt stopped while npm processed core, before uploading metamodel.
The separately authorized [recovery run 44715288456](https://github.com/anarchitects/anarchitecture-modeling/actions/runs/44715288456)
verified/skipped core and published only the original metamodel archive. Metamodel
provenance identifies recovery executor
`fa9dc37eef69f0c2c762ae33e145f41427c6e5b3`; its archive/build source remains
`ed2d1c6`. The archives were not repacked, and the tags were not rewritten.

Downloaded registry bytes and SHA-512 integrity match the approved archives.
Independent installation, every installed package file, exports, README quick
starts, runtime/lifecycle cases, strict declarations and a clean lockfile reinstall
passed. Cryptographic npm signature/attestation verification passed, including
the subject hashes, workflow, repository, executor commits and run identities.
Both public npm pages show the approved README and provenance. See the
[completed execution evidence](https://github.com/anarchitects/anarchitecture-modeling/issues/23#issuecomment-7036881404).

### Recorded limitations and follow-up

npm automatically created `0.0.0-stage` placeholders during ordinary publication
scanning. They remain in both registry histories; at this release `latest` pointed to `0.0.1`.
They are provider placeholders, not official Foundation runtime releases. Install
the exact `0.0.1` versions, not the placeholders.

The immutable `0.0.1` README/bundled guides retain some prepublication wording
(including references to future availability and repository access). Their exact
installation commands and examples passed; the repository and pinned links are
public. This record establishes availability. Johan owns wording cleanup for the
next reviewed candidate; this documentation update does not replace published
bytes or authorize another version.

The separately accepted development-only minimatch risk and real-Dependabot-event
follow-up remain tracked in [#44](https://github.com/anarchitects/anarchitecture-modeling/issues/44).
They are absent from the shipped runtime dependency closure. Owner acceptance of
usable artifacts under #23 and consumer adoption are separate from publication.
