export const environment = {
  production: true,

  /*
   * URL relativa: en el despliegue real el front y el ApiGateway deben
   * servirse detrás del mismo origen (reverse proxy) o cambiar
   * serverBaseUrl al origen del ApiGateway.
   * (La fake API json-server ya no se usa para este flujo.)
   */
  serverBaseUrl: '/api/v1',

  authenticationEndpointPath: '/authentication',
  userEndpointPath: '/users',
  rolesEndpointPath: '/roles',

  residentialEndpointPath: '/residential',
  buildingEndpointPath: '/residential/buildings',
  unitEndpointPath: '/residential/units',
  userUnitEndpointPath: '/residential/user-units',
  residentRegisterEndpointPath: '/residential/residents',

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

};
