export const ROLES = ['Requester', 'Driver', 'Admin', 'Executive'] as const;
export type Role = typeof ROLES[number];


