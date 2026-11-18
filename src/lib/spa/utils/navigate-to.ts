import { init } from '../';
import App from '../../../app';
import { router } from '../router';
import type { RouteDetails } from '../types';

/**
 * After a move to another page, focus goes to its content, where the skip
 * link goes, so screen readers start there instead of on a link that's gone.
 * Not on the first load, where focus starts at the top as on any page.
 */
export const focusNewPage = ({ routeChanged }: RouteDetails) => {
  if (routeChanged)
    document.getElementById('main')?.focus({ preventScroll: true });
};

export const navigateTo = async (url: string) => {
  history.pushState(null, '', url);

  const routeDetails = router();

  await init(App, routeDetails);
  focusNewPage(routeDetails);
};

/** Renders the current page again, without a new history entry. */
export const renderCurrentRoute = async () => {
  await init(App, router());
};
