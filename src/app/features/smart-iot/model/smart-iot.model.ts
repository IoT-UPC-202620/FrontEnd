export type SmartIotSystemType = 'lighting' | 'access-control' | 'irrigation';

export interface LightingEvent {
  id: string;
  type: 'lighting';
  occurredAt: string;
  zone: string;
  device: string;
}

export interface AccessDeniedEvent {
  id: string;
  type: 'access-control';
  occurredAt: string;
  user: string;
  reason: string;
  device?: string;
}

export interface IrrigationEvent {
  id: string;
  type: 'irrigation';
  occurredAt: string;
  sprinkler: string;
  zone: string;
}

export type SmartIotEvent =
  | LightingEvent
  | AccessDeniedEvent
  | IrrigationEvent;

export interface SmartIotSummaryCard {
  type: SmartIotSystemType;
  icon: string;
  title: string;
  description: string;
  metricLabel: string;
  count: number;
  route: string;
  /** true = datos de demostracion (no vienen del backend) */
  demo: boolean;
  lastEvent: SmartIotEvent | null;
}

export interface SmartIotDashboardData {
  cards: SmartIotSummaryCard[];
  activityFrom: Date | null;
  activityTo: Date | null;
}

export interface SmartIotData {
  isDemo: boolean;
  lighting: LightingEvent[];
  accessDenied: AccessDeniedEvent[];
  irrigation: IrrigationEvent[];
  activityFrom: Date | null;
  activityTo: Date | null;
}
