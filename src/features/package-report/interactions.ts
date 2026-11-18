import { addOnClick } from '../../lib/spa';

const showChart = (by: 'month' | 'week') => {
  document
    .getElementById('chart-months')
    ?.toggleAttribute('hidden', by !== 'month');
  document
    .getElementById('chart-weeks')
    ?.toggleAttribute('hidden', by !== 'week');
  document
    .getElementById('chart-month')
    ?.setAttribute('aria-pressed', String(by === 'month'));
  document
    .getElementById('chart-week')
    ?.setAttribute('aria-pressed', String(by === 'week'));
};
const copyInstall = async () => {
  const command = document.getElementById('install-command')?.textContent;
  const button = document.getElementById('copy-install');
  // A changed label isn't always read out, so the result is said here too
  const status = document.getElementById('copy-status');
  const say = (text: string) => {
    button?.setAttribute('aria-label', text);

    if (status) status.textContent = text;
  };

  if (!command || !button) return;

  try {
    await navigator.clipboard.writeText(command);
    say('Copied the install command');
    button.classList.add('is-copied');
  } catch {
    // Without clipboard access, the command can still be selected by hand
    say("Copying isn't allowed here");
  }
};

/** Wires the controls on the package page, for one render. */
export const attachPackageReportEvents = () => {
  addOnClick('chart-month', () => showChart('month'));
  addOnClick('chart-week', () => showChart('week'));
  addOnClick('copy-install', () => {
    void copyInstall();
  });
};
