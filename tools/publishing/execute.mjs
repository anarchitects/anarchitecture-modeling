import assert from 'node:assert/strict';

// Dependencies are injected so interruptions and delayed registry visibility can
// be tested without credentials, real publication or timers.
export async function executePublication({
  report,
  histories,
  publishNames,
  alreadyPublished = [],
  registryVersions,
  verifyPublished,
  waitForPublished,
  upload,
  saveReceipt,
}) {
  const receipts = [];
  const save = (name, status) => {
    const artifact = report.artifacts[name];
    const entry = {
      name,
      version: artifact.artifactVersion,
      sha256: artifact.sha256,
      status,
    };
    const index = receipts.findIndex((item) => item.name === name);
    if (index < 0) receipts.push(entry);
    else receipts[index] = entry;
    saveReceipt(receipts);
  };
  // Verify every skipped artifact before the first possible upload.
  for (const name of alreadyPublished) {
    assert.deepEqual(
      await registryVersions(name),
      histories[name],
      'Registry changed during recovery',
    );
    await verifyPublished(name, report.artifacts[name]);
    save(name, 'already-published-verified');
  }
  for (const name of publishNames) {
    assert.deepEqual(
      await registryVersions(name),
      histories[name],
      'Registry changed during release',
    );
    const artifact = report.artifacts[name];
    if (name === 'modeling-metamodel') {
      const core = report.artifacts['modeling-core'];
      if (core) {
        assert.equal(
          artifact.manifest.dependencies['@anarchitects/modeling-core'],
          core.artifactVersion,
        );
        await verifyPublished('modeling-core', core);
      } else {
        // The caller supplies the existing-core check for a normal meta-only release.
        await verifyPublished('modeling-core', undefined);
      }
    }
    save(name, 'upload-started');
    await upload(name, artifact);
    save(name, 'submitted');
    await waitForPublished(name, artifact);
    save(name, 'available-verified');
  }
  return receipts;
}
