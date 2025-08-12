import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'



interface PermissionCheckRequest {
  userId: string;
  feature: string;
  subFeature?: string;
  action: string;
  organizationId?: number;
}

interface PermissionResult {
  hasPermission: boolean;
  tier?: string;
  conditions?: Record<string, any>;
  reason?: string;
  usageRemaining?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, feature, subFeature, action, organizationId }: PermissionCheckRequest = await req.json()

    if (!userId || !feature || !action) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters: userId, feature, and action are required' 
        }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      )
    }

    // Get user's membership type and organization
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('membership_type, organization_id')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ 
          error: 'User not found or access denied',
          hasPermission: false 
        }),
        { 
          status: 404, 
          headers: corsHeaders 
        }
      )
    }

    // Admin users have all permissions
    if (userData.membership_type === 'admin') {
      return new Response(
        JSON.stringify({
          hasPermission: true,
          tier: 'admin',
          reason: 'Administrator access'
        }),
        { headers: corsHeaders }
      )
    }

    // Get feature ID
    const { data: featureData, error: featureError } = await supabaseClient
      .from('features')
      .select('id')
      .eq('name', feature)
      .eq('is_active', true)
      .single()

    if (featureError || !featureData) {
      return new Response(
        JSON.stringify({ 
          error: 'Feature not found',
          hasPermission: false 
        }),
        { 
          status: 404, 
          headers: corsHeaders 
        }
      )
    }

    // Get action ID
    const { data: actionData, error: actionError } = await supabaseClient
      .from('permission_actions')
      .select('id')
      .eq('name', action)
      .eq('is_active', true)
      .single()

    if (actionError || !actionData) {
      return new Response(
        JSON.stringify({ 
          error: 'Action not found',
          hasPermission: false 
        }),
        { 
          status: 404, 
          headers: corsHeaders 
        }
      )
    }

    let tierData = null
    let tierName = null

    // Check for individual user tier assignment first
    const { data: userTierData, error: userTierError } = await supabaseClient
      .from('user_tier_assignments')
      .select(`
        tier_id,
        permission_tiers (
          id,
          name,
          display_name
        )
      `)
      .eq('user_id', userId)
      .eq('feature_id', featureData.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!userTierError && userTierData) {
      tierData = userTierData.permission_tiers
      tierName = tierData.name
    } else {
      // Check for organization tier assignment
      if (organizationId || userData.organization_id) {
        const orgId = organizationId || userData.organization_id
        const { data: orgTierData, error: orgTierError } = await supabaseClient
          .from('organization_tier_assignments')
          .select(`
            tier_id,
            permission_tiers (
              id,
              name,
              display_name
            )
          `)
          .eq('organization_id', orgId)
          .eq('feature_id', featureData.id)
          .eq('is_active', true)
          .maybeSingle()

        if (!orgTierError && orgTierData) {
          tierData = orgTierData.permission_tiers
          tierName = tierData.name
        }
      }

      // Fall back to membership plan defaults
      if (!tierData) {
        const { data: defaultTierData, error: defaultTierError } = await supabaseClient
          .from('membership_plan_tier_defaults')
          .select(`
            tier_id,
            permission_tiers (
              id,
              name,
              display_name
            )
          `)
          .eq('membership_type', userData.membership_type)
          .eq('feature_id', featureData.id)
          .eq('is_active', true)
          .maybeSingle()

        if (!defaultTierError && defaultTierData) {
          tierData = defaultTierData.permission_tiers
          tierName = tierData.name
        }
      }
    }

    if (!tierData) {
      return new Response(
        JSON.stringify({ 
          hasPermission: false,
          reason: 'No tier assignment found for this feature'
        }),
        { headers: corsHeaders }
      )
    }

    let permissionResult: PermissionResult = {
      hasPermission: false,
      tier: tierName,
      reason: 'Permission not found'
    }

    // Check sub-feature permissions if specified
    if (subFeature) {
      // Get sub-feature ID
      const { data: subFeatureData, error: subFeatureError } = await supabaseClient
        .from('sub_features')
        .select('id')
        .eq('feature_id', featureData.id)
        .eq('name', subFeature)
        .eq('is_active', true)
        .single()

      if (subFeatureError || !subFeatureData) {
        return new Response(
          JSON.stringify({ 
            error: 'Sub-feature not found',
            hasPermission: false 
          }),
          { 
            status: 404, 
            headers: corsHeaders 
          }
        )
      }

      // Check sub-feature permissions
      const { data: subFeaturePermission, error: subFeaturePermError } = await supabaseClient
        .from('tier_sub_feature_permissions')
        .select('is_granted, conditions')
        .eq('tier_id', tierData.id)
        .eq('sub_feature_id', subFeatureData.id)
        .eq('action_id', actionData.id)
        .single()

      if (!subFeaturePermError && subFeaturePermission?.is_granted) {
        permissionResult = {
          hasPermission: true,
          tier: tierName,
          conditions: subFeaturePermission.conditions || {},
          reason: 'Sub-feature permission granted'
        }
      }
    } else {
      // Check feature-level permissions
      const { data: featurePermission, error: featurePermError } = await supabaseClient
        .from('tier_feature_permissions')
        .select('is_granted, conditions')
        .eq('tier_id', tierData.id)
        .eq('feature_id', featureData.id)
        .eq('action_id', actionData.id)
        .single()

      if (!featurePermError && featurePermission?.is_granted) {
        permissionResult = {
          hasPermission: true,
          tier: tierName,
          conditions: featurePermission.conditions || {},
          reason: 'Feature permission granted'
        }
      }
    }

    // Check usage limits if permission is granted and has conditions
    if (permissionResult.hasPermission && permissionResult.conditions?.usage_limit) {
      const usageLimit = permissionResult.conditions.usage_limit

      // Get current usage for today
      const { data: usageData, error: usageError } = await supabaseClient
        .from('feature_usage_tracking')
        .select('usage_count')
        .eq('user_id', userId)
        .eq('feature_id', featureData.id)
        .eq('action_id', actionData.id)
        .eq('usage_date', new Date().toISOString().split('T')[0])
        .maybeSingle()

      const currentUsage = usageData?.usage_count || 0
      const usageRemaining = Math.max(0, usageLimit - currentUsage)

      if (currentUsage >= usageLimit) {
        permissionResult = {
          hasPermission: false,
          tier: tierName,
          reason: 'Usage limit exceeded for today',
          usageRemaining: 0
        }
      } else {
        permissionResult.usageRemaining = usageRemaining
      }
    }

    return new Response(
      JSON.stringify(permissionResult),
      { headers: corsHeaders }
    )

  } catch (error) {
    console.error('Permission check error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        hasPermission: false 
      }),
      { 
        status: 500, 
        headers: corsHeaders 
      }
    )
  }
})