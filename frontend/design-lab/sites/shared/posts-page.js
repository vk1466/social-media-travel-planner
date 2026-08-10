/**
 * Hydrate the posts page mount after site chrome renders.
 */
import { loadLibrary } from "./api.js";
import { mountPostsBrowse } from "./posts-browse.js";

export async function hydratePostsPage({ theme }) {
  const root = document.getElementById("wf-posts-root");
  if (!root) {
    console.warn("[design-lab] #wf-posts-root missing — skip posts hydrate");
    return;
  }

  root.innerHTML = `<div class="wf-posts-loading">Loading saves…</div>`;
  root.className = `wf-posts wf-posts--${theme}`;

  try {
    const library = await loadLibrary(window.WF_MOCK);
    mountPostsBrowse(root, {
      theme,
      posts: library.posts,
      usingLiveData: library.usingLiveData,
      authState: library.authState,
    });
  } catch (err) {
    console.warn("[design-lab] posts hydrate failed", err);
    root.innerHTML = `<div class="wf-posts-empty"><p>Could not load saves.</p></div>`;
  }
}
