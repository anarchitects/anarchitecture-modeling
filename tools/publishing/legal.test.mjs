import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { config } from './prepare.mjs';
import { verifyLegalFiles } from './legal.mjs';

const canonical = (name) =>
  readFileSync(new URL(`../../${name}`, import.meta.url));
const manifest = { license: 'Apache-2.0', private: false };

test('accepted licensing retains canonical legal files independently of activation', () => {
  assert.equal(config.license.status, 'accepted');
  assert.equal(config.license.spdx, manifest.license);
  assert.doesNotThrow(() =>
    verifyLegalFiles(manifest, canonical, config.license),
  );
});

test('rejects stale or substituted license metadata and legal files', () => {
  assert.throws(
    () =>
      verifyLegalFiles({ license: 'UNLICENSED' }, canonical, config.license),
    /Packed license metadata differs/,
  );
  for (const name of ['LICENSE', 'NOTICE']) {
    for (const replacement of [
      '',
      'PREPARATION COPY — NOT CLEARED',
      canonical(name) + '\nchanged',
    ]) {
      assert.throws(
        () =>
          verifyLegalFiles(
            manifest,
            (file) => (file === name ? replacement : canonical(file)),
            config.license,
          ),
        new RegExp(`${name} differs from reviewed source`),
      );
    }
    assert.throws(
      () =>
        verifyLegalFiles(
          manifest,
          (file) => {
            if (file === name) throw new Error(`Missing ${name}`);
            return canonical(file);
          },
          config.license,
        ),
      new RegExp(`Missing ${name}`),
    );
  }
});
