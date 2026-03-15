import ReactGA from 'react-ga4';

const MEASUREMENT_ID = 'G-10PHPJ5XLY';

const enabled =
  import.meta.env.PROD && localStorage.getItem('ga_opt_out') !== '1';

if (enabled) {
  ReactGA.initialize(MEASUREMENT_ID);
}

export function trackEvent(action: string, params?: Record<string, string>) {
  if (!enabled) return;
  ReactGA.event(action, params);
}
