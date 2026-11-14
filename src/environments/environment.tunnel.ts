/*
 * Configuracion "tunnel": el frontend (servido en localhost:4200) consume el
 * ApiGateway expuesto por ngrok. local/start-tunnel.ps1 reescribe serverBaseUrl
 * con el dominio del tunel (NGROK_API_DOMAIN o el aleatorio que asigne ngrok).
 * Es una copia completa de environment.ts (angular.json lo reemplaza con
 * fileReplacements, asi que no puede importarlo): mantener las claves en sincronia.
 * Uso: npm run start:tunnel
 */
export const environment = {
  production: false,

  serverBaseUrl: 'https://url.app/api/v1',

  authenticationEndpointPath: '/authentication',
  userEndpointPath: '/users',
  rolesEndpointPath: '/roles',

  residentialEndpointPath: '/residential',
  buildingEndpointPath: '/residential/buildings',
  unitEndpointPath: '/residential/units',
  userUnitEndpointPath: '/residential/user-units',
  residentRegisterEndpointPath: '/residential/residents',
  // Gestion de residentes (solo ADMIN)
  residentUsersEndpointPath: '/users/residents',
  userSearchEndpointPath: '/users/search',
  residentAssignmentsEndpointPath: '/residential/residents/assignments',

  reservationEndpointPath: '/reservations',
  commonAreaEndpointPath: '/common-areas',
  commonAreaRulesEndpointPath: '/common-area-rules',

  paymentEndpointPath: '/payments',
  debtEndpointPath: '/payments/debts',

  postEndpointPath: '/posts',

  announcementEndpointPath: '/announcements',
  announcementReadEndpointPath: '/announcement-reads',

  notificationEndpointPath: '/notifications',
  deviceTokenEndpointPath: '/device-tokens',
  reportEndpointPath: '/reports',

  telemetryEndpointPath: '/telemetry',

  // IoT: telemetria (IoT-Telemetry) y bitacora de accesos (IoT-Access)
  telemetryDevicesEndpointPath: '/telemetry/devices',
  telemetryReadingsEndpointPath: '/telemetry/readings',
  telemetryAlertsEndpointPath: '/telemetry/alerts',
  accessAttemptsEndpointPath: '/access/attempts',
  iotDevicesEndpointPath: '/iot/devices',

  // Moneda: Payment guarda montos en soles (PEN). Tipo de cambio solo para mostrar en USD.
  exchangeRateUsdToPen: 3.75
};
