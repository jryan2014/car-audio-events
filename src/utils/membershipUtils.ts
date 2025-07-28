/**
 * Utility functions for consistent membership type display
 */

/**
 * Get the display name for a membership type
 * @param membershipType - The raw membership type from the database
 * @param subscriptionPlan - The subscription plan (for competitors)
 * @returns The formatted display name
 */
export function getMembershipDisplayName(
  membershipType: string | undefined,
  subscriptionPlan?: string | undefined
): string {
  if (!membershipType) return 'Unknown';

  switch (membershipType) {
    case 'competitor':
      // For competitors, check the subscription plan
      if (subscriptionPlan === 'pro') {
        return 'Competitor Pro';
      }
      return 'Free Competitor';
    
    case 'pro_competitor':
      // Legacy support for old pro_competitor type
      return 'Competitor Pro';
    
    case 'retailer':
      return 'Retailer';
    
    case 'manufacturer':
      return 'Manufacturer';
    
    case 'organization':
      return 'Organization';
    
    case 'admin':
      return 'Administrator';
    
    default:
      // Capitalize first letter as fallback
      return membershipType.charAt(0).toUpperCase() + membershipType.slice(1);
  }
}

/**
 * Get the badge style classes for a membership type
 * @param membershipType - The raw membership type
 * @param subscriptionPlan - The subscription plan (for competitors)
 * @returns The CSS classes for the badge
 */
export function getMembershipBadgeStyles(
  membershipType: string | undefined,
  subscriptionPlan?: string | undefined
): string {
  if (!membershipType) return 'bg-gray-500/20 text-gray-400';

  if (membershipType === 'competitor') {
    if (subscriptionPlan === 'pro') {
      return 'bg-blue-600/20 text-blue-300'; // Competitor Pro
    }
    return 'bg-blue-500/20 text-blue-400'; // Free Competitor
  }

  const styles: Record<string, string> = {
    pro_competitor: 'bg-blue-600/20 text-blue-300',
    retailer: 'bg-purple-500/20 text-purple-400',
    manufacturer: 'bg-orange-500/20 text-orange-400',
    organization: 'bg-green-500/20 text-green-400',
    admin: 'bg-red-500/20 text-red-400'
  };

  return styles[membershipType] || 'bg-gray-500/20 text-gray-400';
}