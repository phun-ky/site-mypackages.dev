import { faqLink } from '../../../../features/help/sections';
import { STEPS } from '../../../../features/help/steps';

import '../../styles/helpPage.css';

// Plain template strings, not `html`, so Prettier never splits an end tag
// over two lines, which diff-dom can't read (#64)
const hero = `<div class="help-hero">
  <span class="help-eyebrow">Help</span>
  <h1>How it works</h1>
  <p class="help-lede">Search any npm package or user. Signing in and adding an npm token are optional.</p>
</div>`;
const steps = `<ol class="help-steps">${STEPS.map(
  (s) => `<li class="help-card">
  <h2>${s.title}</h2>
  <p>${s.text}</p>
  <p class="help-step-more">${s.more}</p>
  <a class="pill-button" href="${s.action.to}" data-link>${s.action.label}</a>
</li>`
).join('')}</ol>`;
const more = `<section class="help-block" aria-labelledby="more-title">
  <h2 id="more-title">More</h2>
  <div class="help-row"><a class="pill-button" href="${faqLink('how-is-package-health-worked-out')}" data-link>How the score is worked out</a><a class="pill-button" href="/help/about" data-link>Where the data comes from</a><a class="pill-button" href="/help/faq" data-link>Questions and answers</a></div>
</section>`;

/** The steps from the front page, on a page of their own, with a link to take each */
export const HowItWorksPage = async () =>
  `<div class="help-page nebula-page">
  <div class="help-wrap">
    ${hero}
    ${steps}
    ${more}
  </div>
</div>`;
