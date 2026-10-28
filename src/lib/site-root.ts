/**
 * Absolute path of the site root, e.g. "/inspiring-site/" on GitHub Pages or "/" on Netlify.
 * Language pages live one level down (/ru/, /en/), so relative "./" asset paths can't be trusted after
 * switching language; build public asset URLs from this instead.
 */
export const SITE_ROOT = window.location.pathname.replace(/(?:ru|en)\/(?:index\.html)?$/, "").replace(/[^/]*$/, "")

export const asset = (path: string) => SITE_ROOT + path

/** Language segment in the current URL, if any. */
export const pathLang = () => window.location.pathname.match(/\/(ru|en)\/(?:index\.html)?$/)?.[1]
