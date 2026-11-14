export const environment = {
  production: false,

  /*
   * Dev: el frontend habla con el ApiGateway local (Spring Cloud Gateway,
   * http://localhost:8080), que enruta /api/v1/* a los microservicios.
   * Requiere el gateway y residential/iam corriendo; ver README.
   */
  serverBaseUrl:
    'http://localhost:8080/api/v1',

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
