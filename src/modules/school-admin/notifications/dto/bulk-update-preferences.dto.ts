export interface BulkUpdatePreferencesDto {
    preferences: {
      notification_type: string;
      enabled:           boolean;
      delivery_channel:  'in_app' | 'email';
    }[];
  }




