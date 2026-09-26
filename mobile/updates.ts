export const APP_VERSION = '1.3.0';
export const releasesApiUrl = 'https://api.github.com/repos/Vas7204/mixroom/releases?per_page=10';

type GitHubAsset = { name: string; browser_download_url: string };
type GitHubRelease = { draft: boolean; tag_name: string; html_url: string; published_at: string; assets: GitHubAsset[] };

export type AppUpdate = {
  version: string;
  downloadUrl: string;
  releaseUrl: string;
};

export function versionFromTag(tag: string): string | null {
  return tag.match(/v?(\d+\.\d+\.\d+)/i)?.[1] ?? null;
}

export function compareVersions(left: string, right: string): number {
  const a = left.split('.').map(Number);
  const b = right.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = (a[index] || 0) - (b[index] || 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export function selectAvailableUpdate(releases: GitHubRelease[], currentVersion = APP_VERSION): AppUpdate | null {
  const candidates = releases
    .filter(release => !release.draft)
    .map(release => ({ release, version: versionFromTag(release.tag_name), asset: release.assets.find(asset => asset.name.toLowerCase().endsWith('.apk')) }))
    .filter((candidate): candidate is { release: GitHubRelease; version: string; asset: GitHubAsset } => Boolean(candidate.version && candidate.asset))
    .sort((left, right) => compareVersions(right.version, left.version));
  const latest = candidates[0];
  if (!latest || compareVersions(latest.version, currentVersion) <= 0) return null;
  return { version: latest.version, downloadUrl: latest.asset.browser_download_url, releaseUrl: latest.release.html_url };
}

export async function fetchAvailableUpdate(currentVersion = APP_VERSION): Promise<AppUpdate | null> {
  const response = await fetch(releasesApiUrl, { headers: { Accept: 'application/vnd.github+json' } });
  if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
  return selectAvailableUpdate(await response.json(), currentVersion);
}
