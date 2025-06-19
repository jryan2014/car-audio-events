import { supabase } from '../lib/supabase';
import type { 
  AdvertisementImage, 
  AdvertisementImageAnalytics, 
  AdvertisementABTest, 
  CreateAdvertisementImageRequest,
  SetupABTestRequest,
  TrackImageImpressionRequest,
  TrackImageClickRequest,
  ImageManagementResponse,
  AdvertisementWithImages,
  ImageFilter,
  ABTestFilter,
  ImageAnalyticsData,
  ABTestAnalyticsData
} from '../types/advertisement';

/**
 * Advertisement Image Management Service
 * Handles multiple images per advertisement with A/B testing and analytics
 */
export class AdvertisementImageService {
  
  // ==================== IMAGE MANAGEMENT ====================
  
  /**
   * Get all images for a specific advertisement
   */
  async getAdvertisementImages(advertisementId: string): Promise<AdvertisementImage[]> {
    try {
      const { data, error } = await supabase
        .from('advertisement_images')
        .select('*')
        .eq('advertisement_id', advertisementId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching advertisement images:', error);
      throw error;
    }
  }

  /**
   * Get the active image for an advertisement
   */
  async getActiveImage(advertisementId: string): Promise<AdvertisementImage | null> {
    try {
      const { data, error } = await supabase
        .from('advertisement_images')
        .select('*')
        .eq('advertisement_id', advertisementId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data || null;
    } catch (error) {
      console.error('Error fetching active image:', error);
      throw error;
    }
  }

  /**
   * Create a new image for an advertisement
   */
  async createAdvertisementImage(request: CreateAdvertisementImageRequest): Promise<AdvertisementImage> {
    try {
      const imageData = {
        advertisement_id: request.advertisement_id,
        image_url: request.image_url,
        image_title: request.image_title,
        ai_prompt: request.ai_prompt,
        ai_provider: request.ai_provider,
        ai_model: request.ai_model,
        ai_style: request.ai_style,
        ai_quality: request.ai_quality,
        generation_cost: request.generation_cost,
        width: request.width,
        height: request.height,
        status: 'inactive', // Default to inactive
        variant_type: 'single'
      };

      const { data, error } = await supabase
        .from('advertisement_images')
        .insert([imageData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating advertisement image:', error);
      throw error;
    }
  }

  /**
   * Activate an image (deactivates all others for the same ad)
   */
  async activateImage(imageId: string): Promise<ImageManagementResponse> {
    try {
      const { error } = await supabase.rpc('activate_advertisement_image', {
        image_id: imageId
      });

      if (error) throw error;

      return {
        success: true,
        message: 'Image activated successfully'
      };
    } catch (error) {
      console.error('Error activating image:', error);
      return {
        success: false,
        message: 'Failed to activate image',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update image metadata
   */
  async updateImage(imageId: string, updates: Partial<AdvertisementImage>): Promise<AdvertisementImage> {
    try {
      const { data, error } = await supabase
        .from('advertisement_images')
        .update(updates)
        .eq('id', imageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating image:', error);
      throw error;
    }
  }

  /**
   * Delete an image
   */
  async deleteImage(imageId: string): Promise<ImageManagementResponse> {
    try {
      const { error } = await supabase
        .from('advertisement_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      return {
        success: true,
        message: 'Image deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting image:', error);
      return {
        success: false,
        message: 'Failed to delete image',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==================== A/B TESTING ====================

  /**
   * Set up A/B test between two images
   */
  async setupABTest(request: SetupABTestRequest): Promise<AdvertisementABTest> {
    try {
      const { data, error } = await supabase.rpc('setup_ab_test', {
        ad_id: request.advertisement_id,
        image_a_id: request.image_a_id,
        image_b_id: request.image_b_id,
        test_name: request.test_name
      });

      if (error) throw error;

      // Fetch the created test
      const { data: testData, error: testError } = await supabase
        .from('advertisement_ab_tests')
        .select('*')
        .eq('id', data)
        .single();

      if (testError) throw testError;
      return testData;
    } catch (error) {
      console.error('Error setting up A/B test:', error);
      throw error;
    }
  }

  /**
   * Get A/B tests for an advertisement
   */
  async getABTests(advertisementId: string, filter?: ABTestFilter): Promise<AdvertisementABTest[]> {
    try {
      let query = supabase
        .from('advertisement_ab_tests')
        .select('*')
        .eq('advertisement_id', advertisementId)
        .order('created_at', { ascending: false });

      if (filter?.status && filter.status !== 'all') {
        query = query.eq('status', filter.status);
      }

      if (filter?.date_from) {
        query = query.gte('created_at', filter.date_from);
      }

      if (filter?.date_to) {
        query = query.lte('created_at', filter.date_to);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching A/B tests:', error);
      throw error;
    }
  }

  /**
   * Get A/B test performance data
   */
  async getABTestPerformance(testId: string): Promise<ABTestAnalyticsData> {
    try {
      const { data, error } = await supabase
        .from('ab_test_performance')
        .select('*')
        .eq('test_id', testId)
        .single();

      if (error) throw error;

      // Calculate additional metrics
      const testData = data as any;
      const totalDays = testData.start_date && testData.end_date 
        ? Math.ceil((new Date(testData.end_date).getTime() - new Date(testData.start_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        test_id: testData.test_id,
        test_name: testData.test_name,
        status: testData.test_status,
        duration_days: totalDays,
        variant_a: {
          image_url: testData.image_a_url,
          impressions: testData.image_a_impressions,
          clicks: testData.image_a_clicks,
          ctr: testData.image_a_ctr,
          conversions: 0 // TODO: Implement conversion tracking
        },
        variant_b: {
          image_url: testData.image_b_url,
          impressions: testData.image_b_impressions,
          clicks: testData.image_b_clicks,
          ctr: testData.image_b_ctr,
          conversions: 0 // TODO: Implement conversion tracking
        },
        winner: testData.leading_variant === 'A' ? 'A' : 
                testData.leading_variant === 'B' ? 'B' : 
                testData.leading_variant === 'Tie' ? 'Tie' : 'Insufficient Data',
        confidence_level: 0.95, // TODO: Calculate statistical confidence
        improvement_percentage: testData.improvement_percentage,
        statistical_significance: 0 // TODO: Calculate statistical significance
      };
    } catch (error) {
      console.error('Error fetching A/B test performance:', error);
      throw error;
    }
  }

  /**
   * Update A/B test status
   */
  async updateABTestStatus(testId: string, status: AdvertisementABTest['status']): Promise<AdvertisementABTest> {
    try {
      const { data, error } = await supabase
        .from('advertisement_ab_tests')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
          ...(status === 'completed' ? { end_date: new Date().toISOString() } : {})
        })
        .eq('id', testId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating A/B test status:', error);
      throw error;
    }
  }

  // ==================== ANALYTICS & TRACKING ====================

  /**
   * Track image impression
   */
  async trackImpression(request: TrackImageImpressionRequest): Promise<void> {
    try {
      await supabase.rpc('track_image_impression', {
        image_id: request.image_id,
        placement: request.placement_type,
        device: request.device_type,
        user_type: request.user_type
      });
    } catch (error) {
      console.error('Error tracking impression:', error);
      // Don't throw error for tracking - log and continue
    }
  }

  /**
   * Track image click
   */
  async trackClick(request: TrackImageClickRequest): Promise<void> {
    try {
      await supabase.rpc('track_image_click', {
        image_id: request.image_id,
        placement: request.placement_type,
        device: request.device_type,
        user_type: request.user_type
      });
    } catch (error) {
      console.error('Error tracking click:', error);
      // Don't throw error for tracking - log and continue
    }
  }

  /**
   * Get image analytics data
   */
  async getImageAnalytics(imageId: string, dateFrom?: string, dateTo?: string): Promise<ImageAnalyticsData> {
    try {
      // Get basic image info
      const { data: imageData, error: imageError } = await supabase
        .from('advertisement_images')
        .select('*')
        .eq('id', imageId)
        .single();

      if (imageError) throw imageError;

      // Get analytics data
      let query = supabase
        .from('advertisement_image_analytics')
        .select('*')
        .eq('advertisement_image_id', imageId);

      if (dateFrom) query = query.gte('date', dateFrom);
      if (dateTo) query = query.lte('date', dateTo);

      const { data: analyticsData, error: analyticsError } = await query;

      if (analyticsError) throw analyticsError;

      // Aggregate data
      const totalImpressions = analyticsData?.reduce((sum, row) => sum + row.impressions, 0) || 0;
      const totalClicks = analyticsData?.reduce((sum, row) => sum + row.clicks, 0) || 0;
      const totalCost = analyticsData?.reduce((sum, row) => sum + row.cost, 0) || 0;

             // Group by date
       const performanceByDate = analyticsData?.reduce((acc, row) => {
         const existing = acc.find((item: {date: string; impressions: number; clicks: number; ctr: number}) => item.date === row.date);
         if (existing) {
           existing.impressions += row.impressions;
           existing.clicks += row.clicks;
         } else {
           acc.push({
             date: row.date,
             impressions: row.impressions,
             clicks: row.clicks,
             ctr: row.impressions > 0 ? (row.clicks / row.impressions) : 0
           });
         }
         return acc;
       }, [] as Array<{date: string; impressions: number; clicks: number; ctr: number}>) || [];

       // Group by placement
       const performanceByPlacement = analyticsData?.reduce((acc, row) => {
         if (!row.placement_type) return acc;
         
         const existing = acc.find((item: {placement_type: string; impressions: number; clicks: number; ctr: number}) => item.placement_type === row.placement_type);
         if (existing) {
           existing.impressions += row.impressions;
           existing.clicks += row.clicks;
         } else {
           acc.push({
             placement_type: row.placement_type,
             impressions: row.impressions,
             clicks: row.clicks,
             ctr: row.impressions > 0 ? (row.clicks / row.impressions) : 0
           });
         }
         return acc;
       }, [] as Array<{placement_type: string; impressions: number; clicks: number; ctr: number}>) || [];

      return {
        image_id: imageId,
        image_url: imageData.image_url,
        total_impressions: totalImpressions,
        total_clicks: totalClicks,
        total_cost: totalCost,
        avg_ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) : 0,
        performance_by_date: performanceByDate,
        performance_by_placement: performanceByPlacement
      };
    } catch (error) {
      console.error('Error fetching image analytics:', error);
      throw error;
    }
  }

  /**
   * Get advertisement with all images and A/B tests
   */
  async getAdvertisementWithImages(advertisementId: string): Promise<AdvertisementWithImages | null> {
    try {
      // Get advertisement
      const { data: adData, error: adError } = await supabase
        .from('advertisements')
        .select('*')
        .eq('id', advertisementId)
        .single();

      if (adError) throw adError;

      // Get images
      const images = await this.getAdvertisementImages(advertisementId);
      const activeImage = images.find(img => img.status === 'active') || null;

      // Get current A/B test
      const abTests = await this.getABTests(advertisementId, { status: 'active' });
      const currentABTest = abTests.length > 0 ? abTests[0] : undefined;

      return {
        ...adData,
        images,
        active_image: activeImage,
        ab_test: currentABTest
      };
    } catch (error) {
      console.error('Error fetching advertisement with images:', error);
      throw error;
    }
  }

  /**
   * Bulk create images from AI generation
   */
  async createImagesFromAI(
    advertisementId: string, 
    generatedImages: Array<{
      url: string;
      prompt: string;
      provider: string;
      model: string;
      style: string;
      quality: string;
      size: { width: number; height: number; name: string };
      cost: number;
    }>
  ): Promise<AdvertisementImage[]> {
    try {
      const imageRequests = generatedImages.map(img => ({
        advertisement_id: advertisementId,
        image_url: img.url,
        image_title: `AI Generated - ${img.size.name}`,
        ai_prompt: img.prompt,
        ai_provider: img.provider,
        ai_model: img.model,
        ai_style: img.style,
        ai_quality: img.quality,
        generation_cost: img.cost,
        width: img.size.width,
        height: img.size.height,
        status: 'inactive' as const,
        variant_type: 'single' as const
      }));

      const { data, error } = await supabase
        .from('advertisement_images')
        .insert(imageRequests)
        .select();

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error creating images from AI:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const advertisementImageService = new AdvertisementImageService(); 