import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'



interface UsageTrackingRequest {
  userId: string;
  feature: string;
  subFeature?: string;
  action: string;
  usageData?: Record<string, any>;
  usageCount?: number;
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

    const { 
      userId, 
      feature, 
      subFeature, 
      action, 
      usageData = {}, 
      usageCount = 1 
    }: UsageTrackingRequest = await req.json()

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
          error: 'Feature not found' 
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
          error: 'Action not found' 
        }),
        { 
          status: 404, 
          headers: corsHeaders 
        }
      )
    }

    let subFeatureId = null
    if (subFeature) {
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
            error: 'Sub-feature not found' 
          }),
          { 
            status: 404, 
            headers: corsHeaders 
          }
        )
      }
      subFeatureId = subFeatureData.id
    }

    const today = new Date().toISOString().split('T')[0]

    // Check if usage record exists for today
    const { data: existingUsage, error: existingError } = await supabaseClient
      .from('feature_usage_tracking')
      .select('id, usage_count, usage_data')
      .eq('user_id', userId)
      .eq('feature_id', featureData.id)
      .eq('action_id', actionData.id)
      .eq('usage_date', today)
      .eq('sub_feature_id', subFeatureId)
      .maybeSingle()

    if (existingUsage) {
      // Update existing usage record
      const newUsageCount = existingUsage.usage_count + usageCount
      const mergedUsageData = {
        ...(existingUsage.usage_data || {}),
        ...usageData,
        last_updated: new Date().toISOString()
      }

      const { error: updateError } = await supabaseClient
        .from('feature_usage_tracking')
        .update({
          usage_count: newUsageCount,
          usage_data: mergedUsageData
        })
        .eq('id', existingUsage.id)

      if (updateError) {
        throw updateError
      }

      // Update monthly summary
      await updateMonthlySummary(
        supabaseClient, 
        userId, 
        featureData.id, 
        today, 
        usageCount, 
        usageData
      )

      return new Response(
        JSON.stringify({ 
          success: true, 
          total_usage: newUsageCount,
          message: 'Usage updated successfully' 
        }),
        { headers: corsHeaders }
      )
    } else {
      // Create new usage record
      const { error: insertError } = await supabaseClient
        .from('feature_usage_tracking')
        .insert({
          user_id: userId,
          feature_id: featureData.id,
          sub_feature_id: subFeatureId,
          action_id: actionData.id,
          usage_count: usageCount,
          usage_data: {
            ...usageData,
            created: new Date().toISOString()
          },
          usage_date: today
        })

      if (insertError) {
        throw insertError
      }

      // Update monthly summary
      await updateMonthlySummary(
        supabaseClient, 
        userId, 
        featureData.id, 
        today, 
        usageCount, 
        usageData
      )

      return new Response(
        JSON.stringify({ 
          success: true, 
          total_usage: usageCount,
          message: 'Usage tracked successfully' 
        }),
        { headers: corsHeaders }
      )
    }

  } catch (error) {
    console.error('Usage tracking error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: corsHeaders 
      }
    )
  }
})

async function updateMonthlySummary(
  supabaseClient: any,
  userId: string,
  featureId: string,
  usageDate: string,
  usageCount: number,
  usageData: Record<string, any>
) {
  const date = new Date(usageDate)
  const yearMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0]

  // Check if monthly record exists
  const { data: monthlyData, error: monthlyError } = await supabaseClient
    .from('monthly_feature_usage')
    .select('id, total_usage, unique_actions, usage_data')
    .eq('user_id', userId)
    .eq('feature_id', featureId)
    .eq('year_month', yearMonth)
    .maybeSingle()

  if (monthlyData) {
    // Update existing monthly record
    const newTotalUsage = monthlyData.total_usage + usageCount
    const existingUsageData = monthlyData.usage_data || {}
    const mergedMonthlyData = {
      ...existingUsageData,
      last_updated: new Date().toISOString(),
      // Merge usage metrics
      ...Object.keys(usageData).reduce((acc, key) => {
        if (typeof usageData[key] === 'number') {
          acc[key] = (existingUsageData[key] || 0) + usageData[key]
        }
        return acc
      }, {} as Record<string, any>)
    }

    await supabaseClient
      .from('monthly_feature_usage')
      .update({
        total_usage: newTotalUsage,
        usage_data: mergedMonthlyData,
        updated_at: new Date().toISOString()
      })
      .eq('id', monthlyData.id)
  } else {
    // Create new monthly record
    await supabaseClient
      .from('monthly_feature_usage')
      .insert({
        user_id: userId,
        feature_id: featureId,
        year_month: yearMonth,
        total_usage: usageCount,
        unique_actions: 1,
        usage_data: {
          ...usageData,
          created: new Date().toISOString()
        }
      })
  }
}