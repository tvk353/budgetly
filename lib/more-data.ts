export interface UserProfile {
  name: string;
  initials: string;
  role: string;
  email: string;
  workspaceStatus: string;
}

export interface MoreHubData {
  user: UserProfile;
  activeTrackersCount: number;
  totalCategoriesCount: number;
  trashItemsCount: number;
  members: Array<{ initials: string; name: string }>;
  appVersion: string;
  appTagline: string;
}

export const mockMoreHubData: MoreHubData = {
  user: {
    name: 'Aarav Sharma',
    initials: 'AS',
    role: 'Lead',
    email: 'aarav@example.com',
    workspaceStatus: 'Workspace: Household (Active)',
  },
  activeTrackersCount: 2,
  totalCategoriesCount: 14,
  trashItemsCount: 3,
  members: [
    { initials: 'AS', name: 'Aarav' },
    { initials: 'PS', name: 'Priya' },
  ],
  appVersion: 'Budgetly iOS v2.4.1 (Build 890)',
  appTagline: 'Tactile Minimalist Finance · End-to-End Private',
};

