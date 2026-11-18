import { router } from '../router';

import { bootstrap } from './bootstrap';
import { focusNewPage } from './navigate-to';

export const popstate = async () => {
  const routeDetails = router();

  await bootstrap(routeDetails);
  focusNewPage(routeDetails);
};
