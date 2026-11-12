export type AccessCardStatus = 'ACTIVE' | 'SUSPENDED' | 'LOST' | 'REVOKED';

export type CardFilter = 'all' | 'active' | 'inactive';

export interface AccessCredential {
  id: number;
  rfidUid: string;
  buildingId: number;
  userId?: number | null;
  holderName?: string | null;
  status: string; // valor del backend; normalizar con toUpperCase al comparar
  suspensionReason?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  origin?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ExistingCardCredential {
  id: number;
  userId?: number | null;
  holderName?: string | null;
  status?: string | null;
}

export interface CardEnrollment {
  id: number;
  deviceId: number;
  deviceCode: string;
  buildingId: number;
  status: 'ACTIVE' | 'CAPTURED' | 'CANCELLED' | 'EXPIRED' | string;
  startedAt: string;
  expiresAt: string;
  capturedUid?: string | null;
  capturedAt?: string | null;
  existingCredential?: ExistingCardCredential | null;
}

export interface RfidReaderDevice {
  id: number;
  name: string;
  location: string;
  deviceCode: string;
  buildingId: number;
  deviceType: string;
  capabilities: string[];
  status: string;
}

export interface CreateCredentialPayload {
  rfidUid: string;
  buildingId: number;
  userId: number;
  holderName: string;
}

// El backend puede omitir campos: parseo defensivo con valores por defecto.
export function parseCredential(raw: Partial<AccessCredential> | null | undefined): AccessCredential {
  const value = raw ?? {};

  return {
    id: Number(value.id ?? 0),
    rfidUid: String(value.rfidUid ?? ''),
    buildingId: Number(value.buildingId ?? 0),
    userId: value.userId == null ? null : Number(value.userId),
    holderName: value.holderName ?? null,
    status: String(value.status ?? ''),
    suspensionReason: value.suspensionReason ?? null,
    validFrom: value.validFrom ?? null,
    validUntil: value.validUntil ?? null,
    origin: value.origin ?? null,
    createdAt: value.createdAt ?? null,
    updatedAt: value.updatedAt ?? null
  };
}

export function parseEnrollment(raw: Partial<CardEnrollment> | null | undefined): CardEnrollment | null {
  if (!raw) {
    return null;
  }

  return {
    id: Number(raw.id ?? 0),
    deviceId: Number(raw.deviceId ?? 0),
    deviceCode: String(raw.deviceCode ?? ''),
    buildingId: Number(raw.buildingId ?? 0),
    status: String(raw.status ?? ''),
    startedAt: String(raw.startedAt ?? ''),
    expiresAt: String(raw.expiresAt ?? ''),
    capturedUid: raw.capturedUid ?? null,
    capturedAt: raw.capturedAt ?? null,
    existingCredential: raw.existingCredential
      ? {
          id: Number(raw.existingCredential.id ?? 0),
          userId: raw.existingCredential.userId == null ? null : Number(raw.existingCredential.userId),
          holderName: raw.existingCredential.holderName ?? null,
          status: raw.existingCredential.status ?? null
        }
      : null
  };
}

export function parseReaderDevice(raw: Partial<RfidReaderDevice> | null | undefined): RfidReaderDevice {
  const value = raw ?? {};

  return {
    id: Number(value.id ?? 0),
    name: String(value.name ?? ''),
    location: String(value.location ?? ''),
    deviceCode: String(value.deviceCode ?? ''),
    buildingId: Number(value.buildingId ?? 0),
    deviceType: String(value.deviceType ?? ''),
    capabilities: Array.isArray(value.capabilities) ? value.capabilities.map(String) : [],
    status: String(value.status ?? '')
  };
}
