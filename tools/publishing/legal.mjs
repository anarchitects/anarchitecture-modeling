import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Read from this checkout, never from an archive-supplied path or report.
// License-file agreement does not establish candidate readiness or authorization.
export function verifyLegalFiles(manifest, read, license) {
  assert.equal(
    manifest.license,
    license.spdx,
    'Packed license metadata differs',
  );
  for (const [name, file] of [
    ['LICENSE', license.licenseFile],
    ['NOTICE', license.noticeFile],
  ]) {
    const expected = readFileSync(new URL(`../../${file}`, import.meta.url));
    assert.ok(expected.length, `Empty canonical ${name}`);
    assert.deepEqual(
      Buffer.from(read(name)),
      expected,
      `${name} differs from reviewed source`,
    );
  }
}
