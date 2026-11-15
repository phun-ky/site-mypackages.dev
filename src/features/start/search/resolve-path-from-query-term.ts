import {
  type ResolveMode,
  type ResolveResult,
  resolveSearchTarget
} from '../../../services/search/resolve-search-target';

const pathFor = (res: ResolveResult) => {
  if (res.kind === 'package') return `/packages/${res.packageName}`;

  if (res.kind === 'user') return `/users/${res.username}`;

  return `/packages?q=${res.q}`;
};

export const resolvePathFromQueryTerm = async (
  queryTermToUse: string,
  signal?: AbortSignal,
  mode: ResolveMode = 'auto'
) => {
  const res = await resolveSearchTarget(queryTermToUse, mode, signal);
  const to = pathFor(res);

  return {
    to,
    res
  };
};
