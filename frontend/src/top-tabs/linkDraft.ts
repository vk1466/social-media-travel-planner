const LINK_DRAFT_KEY = "wanderfile.link-draft";

export function readLinkDraft(): string {
  try {
    return sessionStorage.getItem(LINK_DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeLinkDraft(value: string): void {
  try {
    if (value) sessionStorage.setItem(LINK_DRAFT_KEY, value);
    else sessionStorage.removeItem(LINK_DRAFT_KEY);
  } catch {
    // Private browsing can block storage; the draft still lives in component state.
  }
}
