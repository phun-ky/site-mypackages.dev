import { getInitialsForUser } from '../../components/page-section/Header/utils/get-initials-for-user';
import type { PagePropsType } from '../../lib/spa/types';
import { escapeHtml } from '../../utils/escape-html';

const repeat = (n: number, markup: string) => markup.repeat(n);

/**
 * The user page's layout, painted while npm is fetched, so the visitor sees
 * the page take shape instead of a blank loader. The name is known from the
 * URL, so it's shown right away. Plain template strings, as in sections.ts
 * (#64).
 */
export const UserPageSkeleton = ({ username }: PagePropsType) => {
  if (!username) return '';

  const name = escapeHtml(username);

  return `<div class="user-page nebula-page" aria-busy="true">
  <div class="user-content">
    <div class="user-head">
      <span class="user-avatar" aria-hidden="true">${escapeHtml(getInitialsForUser(username))}</span>
      <div class="user-title"><h1>${name}</h1><span class="skeleton skeleton-line is-sub" aria-hidden="true"></span></div>
    </div>
    <p class="visually-hidden" role="status">Loading the packages by ${name}</p>
    <div aria-hidden="true">
      <div class="skeleton skeleton-line is-notice"></div>
      <div class="user-overview"><div class="user-card skeleton is-overview"></div><div class="user-card skeleton is-overview"></div></div>
      <div class="user-section">
        <div class="user-section-head"><span class="skeleton skeleton-line is-heading"></span></div>
        <div class="glance">${repeat(3, '<div class="user-card skeleton is-glance"></div>')}</div>
      </div>
      <div class="user-section">
        <div class="user-section-head"><span class="skeleton skeleton-line is-heading"></span></div>
        <div class="pkg-tiles">${repeat(6, '<div class="user-card skeleton is-tile"></div>')}</div>
      </div>
    </div>
  </div>
</div>`;
};
