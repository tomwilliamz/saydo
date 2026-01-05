-- Create devices table for device communication system
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_devices_last_active ON devices(last_active_at);

-- Enable realtime for devices table
ALTER PUBLICATION supabase_realtime ADD TABLE devices;
