-- Add FCM token column to devices table for push notifications
ALTER TABLE devices ADD COLUMN fcm_token TEXT;

-- Index for efficient lookup when sending push notifications
CREATE INDEX idx_devices_fcm_token ON devices(fcm_token) WHERE fcm_token IS NOT NULL;
