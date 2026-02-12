import { apiClient } from './client';
import { VerificationRequest } from '../types';

export const verificationApi = {
  /**
   * Upload verification documents
   */
  uploadDocuments(files: { uri: string; name: string; type: string }[]): Promise<{ message: string; request: VerificationRequest }> {
    // Upload each file as FormData
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`document_${index}`, {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any);
    });

    return apiClient.uploadFile<{ message: string; request: VerificationRequest }>(
      '/api/verification-upload',
      files[0] // Primary document
    );
  },

  /**
   * Get verification requests for the establishment
   */
  getRequests(): Promise<VerificationRequest[]> {
    return apiClient.get<VerificationRequest[]>('/api/mobile/establishment/verification');
  },
};
