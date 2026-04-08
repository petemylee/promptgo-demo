/** Dispatched when the user clicks the already-active sidebar item (same href as current path). */
export const SIDEBAR_ROUTE_RESET_EVENT = 'resetSidebarRouteSubView';

export type SidebarRouteResetDetail = { href: string };
