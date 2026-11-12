/**
 * PROTOTYPE — datos stub para las variantes del dashboard IoT de administrador.
 * Solo lectura. Mismos datos en A, B y C para que la comparación sea estructural.
 * US reales cubiertas: US44 (estado de conexión), US41 (consumo/series), US42 (anomalías), US34 (bitácora/accesos).
 */
export interface StubReading { t: string; value: number }

export interface StubDevice {
  code: string;
  name: string;
  location: string;
  type: 'DOOR' | 'LIGHT' | 'VALVE' | 'CLIMATE';
  status: 'ACTIVE' | 'OFFLINE';
  lastSeenMinutesAgo: number;
  temperature?: number;
  humidity?: number;
  battery: number;
  rssi: number;
  spark: number[];
}

export interface StubAlert {
  id: string;
  deviceCode: string;
  severity: 'critica' | 'alta' | 'media';
  message: string;
  minutesAgo: number;
}

export interface StubEvent {
  id: string;
  kind: 'alert' | 'heartbeat' | 'command' | 'access' | 'recovery';
  title: string;
  detail: string;
  minutesAgo: number;
}

const tempSpark = (base: number): number[] =>
  Array.from({ length: 24 }, (_, i) => Math.round((base + Math.sin(i / 3.2) * 2.1 + Math.cos(i / 5) * 0.9) * 10) / 10);

export const STUB_DEVICES: StubDevice[] = [
  { code: 'DOOR-001', name: 'Puerta principal torre A', location: 'Hall · Torre A', type: 'DOOR', status: 'ACTIVE', lastSeenMinutesAgo: 1, battery: 82, rssi: -61, spark: tempSpark(24.1), temperature: 24.3, humidity: 57 },
  { code: 'DHT-101', name: 'Sensor clima hall', location: 'Hall · Torre A', type: 'CLIMATE', status: 'ACTIVE', lastSeenMinutesAgo: 2, battery: 91, rssi: -55, spark: tempSpark(23.4), temperature: 23.6, humidity: 61 },
  { code: 'LGT-018', name: 'Iluminaria vestíbulo', location: 'Vestíbulo · Torre A', type: 'LIGHT', status: 'ACTIVE', lastSeenMinutesAgo: 0, battery: 100, rssi: -58, spark: tempSpark(25.0), temperature: 25.1, humidity: 52 },
  { code: 'DHT-102', name: 'Sensor clima pasillo piso 2', location: 'Pasillo P2 · Torre A', type: 'CLIMATE', status: 'OFFLINE', lastSeenMinutesAgo: 147, battery: 12, rssi: -90, spark: tempSpark(21.8), temperature: 22.0, humidity: 66 },
  { code: 'VLV-201', name: 'Válvula riego jardín central', location: 'Jardín central', type: 'VALVE', status: 'ACTIVE', lastSeenMinutesAgo: 3, battery: 74, rssi: -66, spark: tempSpark(26.2), temperature: 26.8, humidity: 48 },
  { code: 'DOOR-002', name: 'Puerta servicio torre B', location: 'Hall · Torre B', type: 'DOOR', status: 'OFFLINE', lastSeenMinutesAgo: 58, battery: 43, rssi: -84, spark: tempSpark(23.0), temperature: 23.2, humidity: 59 },
  { code: 'LGT-024', name: 'Iluminaria pasillo piso 2', location: 'Pasillo P2 · Torre B', type: 'LIGHT', status: 'ACTIVE', lastSeenMinutesAgo: 1, battery: 100, rssi: -49, spark: tempSpark(24.6), temperature: 24.9, humidity: 55 },
  { code: 'VLV-202', name: 'Válvula riego jardines acceso', location: 'Jardineras acceso', type: 'VALVE', status: 'ACTIVE', lastSeenMinutesAgo: 5, battery: 68, rssi: -71, spark: tempSpark(27.4), temperature: 28.1, humidity: 44 }
];

export const STUB_ALERTS: StubAlert[] = [
  { id: 'al-1', deviceCode: 'DHT-102', severity: 'critica', message: 'Sensor sin heartbeat hace 147 min (umbral 30 min)', minutesAgo: 147 },
  { id: 'al-2', deviceCode: 'VLV-202', severity: 'alta', message: 'Humedad de suelo bajo el umbral: 28 % (< 35 %)', minutesAgo: 38 },
  { id: 'al-3', deviceCode: 'DOOR-002', severity: 'media', message: 'RSSI degradado (-84 dBm) — revisar gateway', minutesAgo: 58 }
];

export const STUB_EVENTS: StubEvent[] = [
  { id: 'ev-1', kind: 'heartbeat', title: 'DOOR-001 · heartbeat', detail: 'RSSI -61 dBm, batería 82 %', minutesAgo: 1 },
  { id: 'ev-2', kind: 'access', title: 'Acceso DENIED · DOOR-001', detail: 'Tarjeta ··4471 · motivo: fuera de horario', minutesAgo: 4 },
  { id: 'ev-3', kind: 'alert', title: 'ALERTA alta · VLV-202', detail: 'Humedad de suelo 28 % bajo umbral 35 %', minutesAgo: 38 },
  { id: 'ev-4', kind: 'recovery', title: 'LGT-018 · recuperado', detail: 'Volvió a reportar tras 6 min OFFLINE', minutesAgo: 41 },
  { id: 'ev-5', kind: 'command', title: 'Comando ACK · VLV-201', detail: 'Apertura 10 min confirmada por el nodo', minutesAgo: 52 },
  { id: 'ev-6', kind: 'heartbeat', title: 'DOOR-002 · sin respuesta', detail: 'Último heartbeat hace 58 min', minutesAgo: 58 },
  { id: 'ev-7', kind: 'access', title: 'Acceso GRANTED · DOOR-001', detail: 'Residente U-118 · Dpto 502 · reserva válida', minutesAgo: 73 },
  { id: 'ev-8', kind: 'recovery', title: 'DHT-101 · recuperado', detail: 'RSSI -55 dBm, lectura estable', minutesAgo: 96 },
  { id: 'ev-9', kind: 'alert', title: 'ALERTA crítica · DHT-102', detail: 'Sin heartbeat hace 147 min', minutesAgo: 147 },
  { id: 'ev-10', kind: 'command', title: 'Comando expirado · DOOR-002', detail: 'Orden SET_LED sin ACK en 60 s', minutesAgo: 150 }
];

export const AVG_TEMP = [
  22.1, 21.8, 21.6, 21.4, 21.7, 22.9, 24.4, 26.0, 27.1, 27.8, 28.2, 28.0,
  27.6, 27.3, 26.8, 26.1, 25.2, 24.6, 24.2, 23.8, 23.4, 23.0, 22.6, 22.3
];
export const AVG_HUMIDITY = [
  64, 65, 66, 66, 65, 62, 59, 56, 53, 51, 50, 50,
  51, 52, 52, 53, 54, 56, 57, 58, 59, 60, 61, 63
];

export function minutesAgoLabel(minutes: number): string {
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `hace ${hours} h ${rest} min` : `hace ${hours} h`;
}
