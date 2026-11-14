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

// ---- Agregado en feature/local-setup: panel "Telemetria en vivo" de /app/smart-iot ----

export type TelemetryMagnitude = 'TEMPERATURE' | 'HUMIDITY';

/** Mismo recurso que DeviceTelemetry (GET /telemetry/devices). */
export type TelemetryDevice = DeviceTelemetry;

export interface AccessAttempt {
  id: number;
  deviceId: number;
  deviceCode: string;
  userId: number | null;
  credentialId: number | null;
  rfidUidMasked: string | null;
  accessMode: string;
  result: 'GRANTED' | 'DENIED';
  reason: string;
  occurredAt: string;
  receivedAt: string;
}

/** Origen del dispositivo segun el firmware que reporta (sin cambios en el backend). */
export type DeviceOrigin = 'seed' | 'simulated' | 'real';

export function deviceOrigin(firmwareVersion: string | null | undefined): DeviceOrigin | null {
  if (!firmwareVersion) return null;
  if (firmwareVersion === 'seed') return 'seed';
  if (firmwareVersion.endsWith('-sim')) return 'simulated';
  return 'real';
}

export const DEVICE_ORIGIN_LABELS: Record<DeviceOrigin, string> = {
  seed: 'Seed',
  simulated: 'Simulado',
  real: 'Real'
};

export const ACCESS_REASON_LABELS: Record<string, string> = {
  GRANTED: 'Acceso concedido',
  NOT_REGISTERED: 'Credencial no registrada',
  SUSPENDED: 'Credencial suspendida',
  DELINQUENT: 'Residente con deuda',
  REVOKED: 'Credencial revocada',
  EXPIRED: 'Credencial vencida',
  NOT_AUTHORIZED: 'No autorizado',
  MAINTENANCE: 'Área en mantenimiento',
  OUT_OF_SCHEDULE: 'Fuera del horario autorizado',
  UNSUPPORTED: 'No soportado'
};

export const ALERT_KIND_LABELS: Record<string, string> = {
  device_offline: 'Dispositivo sin conexión',
  sensor_fault_temperature: 'Falla del sensor de temperatura',
  sensor_fault_humidity: 'Falla del sensor de humedad'
};
