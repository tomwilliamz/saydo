-- Create alerts table for device-to-device messaging
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  to_device_id UUID REFERENCES devices(id) ON DELETE SET NULL,  -- null = broadcast to all
  message TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'dismissed', 'expired')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours'),
  dismissed_at TIMESTAMPTZ,
  dismissed_by_device_id UUID REFERENCES devices(id) ON DELETE SET NULL
);

CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_to_device ON alerts(to_device_id);
CREATE INDEX idx_alerts_expires ON alerts(expires_at);

-- Enable realtime for alerts table
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
