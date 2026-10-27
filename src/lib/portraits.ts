// Portrait choices come from the images at the root of a public GitHub repo.
// Add a picture to the repo and it shows up in the portrait picker.
const REPO = "Sylvie-On-Ghub/DnD-photos";
const IMAGE = /\.(png|jpe?g|webp|gif)$/i;

export type PortraitOption = { name: string; url: string };

type GitHubEntry = { type?: string; name?: string; download_url?: string | null };

export async function listPortraits(): Promise<PortraitOption[]> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) {
    // 403 here is usually GitHub's limit of 60 unauthenticated requests an hour.
    throw new Error(
      res.status === 403
        ? "GitHub is limiting requests right now. Try again later."
        : `Couldn't load pictures (HTTP ${res.status})`
    );
  }
  const entries = (await res.json()) as GitHubEntry[];
  return entries
    .filter((e) => e.type === "file" && e.download_url && IMAGE.test(e.name ?? ""))
    .map((e) => ({ name: e.name!, url: e.download_url! }));
}
