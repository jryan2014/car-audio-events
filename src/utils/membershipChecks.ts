// Membership types that have access to member directory features
export const DIRECTORY_ACCESS_TYPES = [
  'pro_competitor',
  'retailer', 
  'manufacturer',
  'organization',
  'admin'
] as const;

export function hasDirectoryAccess(membershipType?: string): boolean {
  if (!membershipType) return false;
  return DIRECTORY_ACCESS_TYPES.includes(membershipType as any);
}

export function getMembershipFeatures(membershipType?: string) {
  const features = {
    canCreateProfile: false,
    canUploadImages: false,
    maxImages: 0,
    canSetPublicVisibility: false,
    canViewMemberDirectory: true, // All logged-in users can view
  };

  if (!membershipType) return features;

  // Free members (competitor) - can view but not create profiles
  if (membershipType === 'competitor') {
    return features;
  }

  // Paid members get full access
  if (hasDirectoryAccess(membershipType)) {
    return {
      canCreateProfile: true,
      canUploadImages: true,
      maxImages: 25,
      canSetPublicVisibility: true,
      canViewMemberDirectory: true,
    };
  }

  return features;
}