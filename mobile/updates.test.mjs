import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { compareVersions, selectAvailableUpdate, versionFromTag } from './updates.ts';

test('Release tags are converted to comparable app versions', () => {
  assert.equal(versionFromTag('v1.2.0-alpha'), '1.2.0');
  assert.equal(versionFromTag('release-without-version'), null);
  assert.ok(compareVersions('1.10.0', '1.9.9') > 0);
  assert.equal(compareVersions('2.0.0', '2.0.0'), 0);
});

test('Update selection ignores drafts and releases without APK files', () => {
  const releases = [
    { draft: false, tag_name: 'v1.1.0-alpha', html_url: 'old', published_at: '', assets: [{ name: 'old.apk', browser_download_url: 'old-apk' }] },
    { draft: true, tag_name: 'v3.0.0', html_url: 'draft', published_at: '', assets: [{ name: 'draft.apk', browser_download_url: 'draft-apk' }] },
    { draft: false, tag_name: 'v1.3.0-alpha', html_url: 'new', published_at: '', assets: [{ name: 'notes.txt', browser_download_url: 'notes' }, { name: 'new.apk', browser_download_url: 'new-apk' }] },
  ];
  assert.deepEqual(selectAvailableUpdate(releases, '1.2.0'), { version: '1.3.0', downloadUrl: 'new-apk', releaseUrl: 'new' });
  assert.equal(selectAvailableUpdate(releases, '1.3.0'), null);
});
