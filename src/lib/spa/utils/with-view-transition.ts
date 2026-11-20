/**
 * Runs a DOM update as a view transition, so the new content fades in over
 * the old, and resolves once the DOM is updated. Without the API, or for
 * visitors who ask for less motion, the update runs at once.
 */
export const withViewTransition = async (update: () => void) => {
  if (
    !document.startViewTransition ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
    return update();

  const transition = document.startViewTransition(update);

  // Rejects when the next update, like the page after its skeleton, starts
  // its own transition first. The update itself still runs
  transition.ready.catch(() => {});

  await transition.updateCallbackDone;
};
