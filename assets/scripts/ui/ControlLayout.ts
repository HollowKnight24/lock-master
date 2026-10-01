import { sys } from 'cc';

/** One web build can choose its controls before a gameplay panel opens. */
export function usesTouchControls(): boolean {
    if (sys.isMobile) return true;
    if (typeof window === 'undefined') return false;
    const { hostname, search } = window.location;
    return (hostname === 'localhost' || hostname === '127.0.0.1')
        && new URLSearchParams(search).get('touchPreview') === '1';
}
