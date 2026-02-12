import { apiClient } from './client';
import { CloudflareDirectUploadResponse, Media } from '../types';

export const cloudflareApi = {
  /**
   * Get a direct upload URL for Cloudflare Images
   */
  getDirectUploadUrl(): Promise<CloudflareDirectUploadResponse> {
    return apiClient.post<CloudflareDirectUploadResponse>('/api/cloudflare/images/direct-upload');
  },

  /**
   * Attach an uploaded image to an activity
   */
  attachImage(data: {
    activityId: string;
    id: string;
    fileName?: string;
    fileSize?: number;
  }): Promise<Media> {
    return apiClient.post<Media>('/api/cloudflare/images/attach', data, { retries: 2 });
  },

  /**
   * Full upload flow: get URL -> upload to CF -> attach to activity
   */
  async uploadImage(
    activityId: string,
    file: { uri: string; name: string; type: string; size?: number }
  ): Promise<Media> {
    // Step 1: Get direct upload URL
    const { uploadURL, id } = await this.getDirectUploadUrl();

    // Step 2: Upload directly to Cloudflare
    await apiClient.uploadToExternal(uploadURL, file);

    // Step 3: Attach to activity in our DB
    return this.attachImage({
      activityId,
      id,
      fileName: file.name,
      fileSize: file.size,
    });
  },
};
