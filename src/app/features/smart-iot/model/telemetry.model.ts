export interface LatestReading {
  magnitude: string;
  value: number;
  unit: string;
  capturedAt: string;
}

export interface DeviceTelemetry {
  deviceCode: string;
  deviceId: number;
  name: string;
  buildingId: number;
  connectionStatus: string;
  lastHeartbeatAt: string | null;
  latest: LatestReading[];
}

export interface ReadingPoint {
  t: string;
  value: number;
  min: number;
  max: number;
  count: number;
}

export interface ReadingSeries {
  deviceCode: string;
  magnitude: string;
  unit: string;
  bucket: string;
  from: string;
  to: string;
  points: ReadingPoint[];
}

export interface TelemetryAlert {
  id: number;
  deviceCode: string;
  kind: string;
  state: string;
  details: Record<string, unknown>;
  occurredAt: string;
}
