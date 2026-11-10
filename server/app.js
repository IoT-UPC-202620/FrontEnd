/*
 * Fake API de Edifika (json-server).
 *
 * Este módulo construye la app de Express y la EXPORTA, sin hacer listen().
 * De ese modo el mismo servidor puede usarse en dos entornos:
 *
 *   - Local  -> server/server.js  (hace listen y persiste los cambios en db.json)
 *   - Vercel -> api/fake-api.js  (Serverless Function, base de datos en memoria)
 *
 * En Vercel el sistema de archivos es de solo lectura, por eso no se puede usar
 * el adaptador FileSync de lowdb. Cuando detecta Vercel se pasa el objeto ya
 * parseado a jsonServer.router(), que internamente usa el adaptador Memory
 * (ver json-server/lib/server/router/index.js).
 */
const path = require('path');
const jsonServer = require('json-server');

/* Vercel expone VERCEL=1 en las Serverless Functions. */
const IS_SERVERLESS = Boolean(process.env.VERCEL);

/*
 * db.json se carga una sola vez por instancia. En local se le pasa la RUTA para
 * que lowdb siga leyendo/escribiendo el archivo; en serverless se le pasa el
 * objeto para que use el adaptador en memoria.
 */
const DB_SOURCE = IS_SERVERLESS ? require('./db.json') : path.join(__dirname, 'db.json');

const server = jsonServer.create();

const router = jsonServer.router(DB_SOURCE);

/*
 * defaults() siempre monta express.static() sobre `static`, y serve-static
 * lanza "root path required" si recibe un valor falsy. Apuntamos a una carpeta
 * que no existe para no servir los assets de Angular desde la API.
 */
const NO_STATIC_DIR = path.join(__dirname, '__no_static_dir__');

server.use(jsonServer.defaults({ static: NO_STATIC_DIR, noGzip: true }));
server.use(jsonServer.bodyParser);

// Acepta /api/v1/... igual que el gateway real: se quita el prefijo
server.use((req, _res, next) => {
  if (req.url.startsWith('/api/v1/')) {
    req.url = req.url.replace('/api/v1', '');
  }
  next();
});

const db = router.db;

const getNextId = (collectionName) => {
  const collection = db.get(collectionName).value() || [];

  if (collection.length === 0) {
    return 1;
  }

  return Math.max(
    ...collection.map(item => Number(item.id) || 0)
  ) + 1;
};

/* =========================================================
   AUTHENTICATION
   ========================================================= */

server.post('/authentication/sign-in', (req, res) => {
  const { email, password } = req.body;

  const auth = db
    .get('authentication')
    .find({ email, password })
    .value();

  if (!auth) {
    return res.status(401).json({
      message: 'Credenciales incorrectas'
    });
  }

  const user = db
    .get('users')
    .find({ id: auth.userId })
    .value();

  if (!user) {
    return res.status(404).json({
      message: 'Usuario no encontrado'
    });
  }

  const userUnit = db
    .get('userUnits')
    .find({ idUser: user.id })
    .value();

  const buildingId = userUnit
    ? userUnit.idBuilding ?? userUnit.buildingId
    : null;

  return res.status(200).json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    roles: user.roles,
    buildingId,
    token: auth.token
  });
});

server.post('/authentication/sign-up', (req, res) => {
  const {
    fullName,
    email,
    password,
    phone,
    documentType,
    documentNumber
  } = req.body;

  if (
    !fullName ||
    !email ||
    !password ||
    !documentType ||
    !documentNumber
  ) {
    return res.status(400).json({
      message: 'Faltan campos obligatorios'
    });
  }

  const existingUser = db
    .get('users')
    .find({ email })
    .value();

  if (existingUser) {
    return res.status(400).json({
      message: 'El email ya se encuentra registrado'
    });
  }

  const userId = getNextId('users');
  const authId = getNextId('authentication');

  const newUser = {
    id: userId,
    fullName,
    email,
    phone,
    status: 'ACTIVE',
    documentType,
    documentNumber,
    roles: ['ADMIN']
  };

  const token = `fake-jwt-token-user-${userId}-${Date.now()}`;

  const newAuthentication = {
    id: authId,
    email,
    password,
    token,
    userId
  };

  db.get('users').push(newUser).write();
  db.get('authentication').push(newAuthentication).write();

  return res.status(201).json(newUser);
});

/* =========================================================
   DEVICE TOKENS
   ========================================================= */

server.post('/device-tokens', (req, res) => {
  const { userId, token } = req.body;

  if (!userId || !token) {
    return res.status(400).json({
      message: 'userId y token son obligatorios'
    });
  }

  const existingToken = db
    .get('deviceTokens')
    .find({ userId: Number(userId) })
    .value();

  if (existingToken) {
    const updatedToken = db
      .get('deviceTokens')
      .find({ userId: Number(userId) })
      .assign({
        token,
        updatedAt: new Date().toISOString()
      })
      .write();

    return res.status(200).json(updatedToken);
  }

  const newDeviceToken = {
    id: getNextId('deviceTokens'),
    userId: Number(userId),
    token,
    createdAt: new Date().toISOString()
  };

  db.get('deviceTokens')
    .push(newDeviceToken)
    .write();

  return res.status(201).json(newDeviceToken);
});

server.get('/device-tokens/user/:userId', (req, res) => {
  const userId = Number(req.params.userId);

  const deviceToken = db
    .get('deviceTokens')
    .find({ userId })
    .value();

  if (!deviceToken) {
    return res.status(404).json({
      message: 'Token del dispositivo no encontrado'
    });
  }

  return res.status(200).json(deviceToken);
});

server.get('/device-tokens/:id', (req, res) => {
  const id = Number(req.params.id);

  const deviceToken = db
    .get('deviceTokens')
    .find({ id })
    .value();

  if (!deviceToken) {
    return res.status(404).json({
      message: 'Token del dispositivo no encontrado'
    });
  }

  return res.status(200).json(deviceToken);
});

/* =========================================================
   NOTIFICATIONS
   ========================================================= */

server.post('/notifications', (req, res) => {
  const { userId, title, content } = req.body;

  if (!userId || !title || !content) {
    return res.status(400).json({
      message: 'userId, title y content son obligatorios'
    });
  }

  const newNotification = {
    id: getNextId('notifications'),
    userId: Number(userId),
    title,
    content,
    read: false,
    createdAt: new Date().toISOString()
  };

  db.get('notifications')
    .push(newNotification)
    .write();

  return res.status(201).json(newNotification);
});

server.get('/notifications/user/:userId', (req, res) => {
  const userId = Number(req.params.userId);

  const page = Math.max(Number(req.query.page) || 0, 0);
  const size = Math.max(Number(req.query.size) || 10, 1);

  const notifications = db
    .get('notifications')
    .filter({ userId })
    .orderBy('createdAt', 'desc')
    .value();

  const start = page * size;
  const content = notifications.slice(start, start + size);
  const totalElements = notifications.length;
  const totalPages = Math.ceil(totalElements / size);

  /*
   * Se retorna una estructura parecida a Page<T> de Spring.
   */
  return res.status(200).json({
    content,
    pageable: {
      pageNumber: page,
      pageSize: size,
      offset: start,
      paged: true,
      unpaged: false
    },
    totalElements,
    totalPages,
    size,
    number: page,
    numberOfElements: content.length,
    first: page === 0,
    last: totalPages === 0 || page >= totalPages - 1,
    empty: content.length === 0
  });
});

server.get('/notifications/:id', (req, res) => {
  const id = Number(req.params.id);

  const notification = db
    .get('notifications')
    .find({ id })
    .value();

  if (!notification) {
    return res.status(404).json({
      message: 'Notificación no encontrada'
    });
  }

  return res.status(200).json(notification);
});

server.patch('/notifications/:id/read', (req, res) => {
  const id = Number(req.params.id);

  const notification = db
    .get('notifications')
    .find({ id })
    .value();

  if (!notification) {
    return res.status(404).json({
      message: 'Notificación no encontrada'
    });
  }

  const updatedNotification = db
    .get('notifications')
    .find({ id })
    .assign({
      read: true,
      readAt: new Date().toISOString()
    })
    .write();

  return res.status(200).json(updatedNotification);
});

/* =========================================================
   FINANCIAL REPORT
   ========================================================= */

server.get(
  '/reports/financial/buildings/:buildingId',
  (req, res) => {
    const buildingId = Number(req.params.buildingId);

    const building = db
      .get('buildings')
      .find({ id: buildingId })
      .value();

    if (!building) {
      return res.status(404).json({
        message: 'Edificio no encontrado'
      });
    }

    const units = db
      .get('units')
      .filter(unit =>
        Number(unit.idBuilding ?? unit.buildingId) === buildingId
      )
      .value();

    const unitIds = units.map(unit => Number(unit.id));

    const userUnits = db
      .get('userUnits')
      .filter(userUnit =>
        Number(userUnit.idBuilding ?? userUnit.buildingId) === buildingId
      )
      .value();

    const users = db.get('users').value() || [];
    const payments = db.get('payments').value() || [];
    const allDebts = db.get('debts').value() || [];
    const reservations = db.get('reservations').value() || [];
    const commonAreas = db.get('commonAreas').value() || [];
    const commonAreaRules = db.get('commonAreaRules').value() || [];

    const debts = allDebts.filter(debt =>
      unitIds.includes(Number(debt.unitId ?? debt.idUnit))
    );

    const paidPayments = payments.filter(payment =>
      String(payment.status).toUpperCase() === 'PAID'
    );

    const pendingDebts = debts.filter(debt =>
      String(debt.status).toUpperCase() === 'PENDING'
    );

    const currentDate = new Date();

    const overdueDebts = pendingDebts.filter(debt =>
      new Date(debt.dueDate) < currentDate
    );

    const totalPaid = paidPayments.reduce(
      (total, payment) => total + Number(payment.amount || 0),
      0
    );

    const totalPending = pendingDebts.reduce(
      (total, debt) => total + Number(debt.amount || 0),
      0
    );

    const totalOverdue = overdueDebts.reduce(
      (total, debt) => total + Number(debt.amount || 0),
      0
    );

    const expectedAmount = totalPaid + totalPending;

    const collectionRate =
      expectedAmount === 0
        ? 0
        : (totalPaid / expectedAmount) * 100;

    const arrearsPercentage =
      totalPending === 0
        ? 0
        : (totalOverdue / totalPending) * 100;

    const occupiedUnits = units.filter(unit =>
      String(unit.status).toUpperCase() === 'OCCUPIED'
    ).length;

    const occupancyRate =
      units.length === 0
        ? 0
        : (occupiedUnits / units.length) * 100;

    const outstandingBalances = pendingDebts.map(debt => {
      const debtUnitId = Number(debt.unitId ?? debt.idUnit);

      const unit = units.find(
        currentUnit => Number(currentUnit.id) === debtUnitId
      );

      const userUnit = userUnits.find(
        relation =>
          Number(relation.idUnit ?? relation.unitId) === debtUnitId
      );

      const userId = userUnit
        ? Number(userUnit.idUser ?? userUnit.userId)
        : null;

      const user = users.find(
        currentUser => Number(currentUser.id) === userId
      );

      const userPayments = payments
        .filter(payment =>
          Number(payment.userId ?? payment.idUser) === userId
        )
        .sort(
          (first, second) =>
            new Date(second.paymentDate).getTime() -
            new Date(first.paymentDate).getTime()
        );

      return {
        debtId: debt.id,
        unitId: debtUnitId,
        unitNumber: unit?.unitNumber ?? 'N/A',
        residentId: user?.id ?? null,
        residentName: user?.fullName ?? 'Unknown',
        buildingId,
        buildingName: building.name,
        dueDate: debt.dueDate,
        lastPaymentDate:
          userPayments.length > 0
            ? userPayments[0].paymentDate
            : null,
        amountDue: Number(debt.amount || 0),
        status:
          new Date(debt.dueDate) < currentDate
            ? 'OVERDUE'
            : 'GRACE_PERIOD'
      };
    });

    const areas = commonAreas
      .filter(area =>
        Number(area.idBuilding ?? area.buildingId) === buildingId
      )
      .map(area => {
        const areaReservations = reservations.filter(reservation =>
          Number(reservation.commonAreaId ?? reservation.idCommonArea) ===
          Number(area.id)
        );

        const rule = commonAreaRules.find(currentRule =>
          Number(
            currentRule.commonAreaId ??
            currentRule.idCommonArea
          ) === Number(area.id)
        );

        const validReservations = areaReservations.filter(reservation =>
          !['CANCELLED', 'REJECTED'].includes(
            String(reservation.status).toUpperCase()
          )
        );

        const price = Number(rule?.price || 0);

        return {
          idArea: area.id,
          areaName: area.name,
          totalPagoGanadoPorArea:
            validReservations.length * price,
          totalVecesReservadas: validReservations.length
        };
      });

    const reservationIncome = areas.reduce(
      (total, area) =>
        total + Number(area.totalPagoGanadoPorArea || 0),
      0
    );

    const report = {
      buildingId,
      buildingName: building.name,

      deudaTotal: totalPending,
      deudaAtrasadaTotal: totalOverdue,
      dineroRecolectadoPorPagoDeuda: totalPaid,

      collectionRate,
      porcentajeDeAtraso: arrearsPercentage,
      occupancyRate,

      dineroRecolectadoPorPagoDeAreas: reservationIncome,

      totalRevenue: totalPaid + reservationIncome,
      pendingDues: totalPending,
      pendingUnitsCount: new Set(
        pendingDebts.map(debt =>
          Number(debt.unitId ?? debt.idUnit)
        )
      ).size,
      arrears: totalOverdue,

      outstandingBalances,
      areas
    };

    return res.status(200).json(report);
  }
);

/* =========================================================
   POSTS (el front espera una respuesta paginada: { content: [...] })
   ========================================================= */

server.get('/posts', (_req, res) => {
  const content = db.get('posts').value() || [];

  return res.status(200).json({
    content,
    totalElements: content.length,
    totalPages: 1,
    size: content.length,
    number: 0,
    empty: content.length === 0
  });
});

/* =========================================================
   RESERVATIONS
   ========================================================= */

// Crear reserva: evita duplicados (US19) y deja la reserva ACTIVE
server.post('/reservations', (req, res) => {
  const { residentId, commonAreaId, reservationDate, timeSlot } = req.body;

  if (!residentId || !commonAreaId || !reservationDate || timeSlot === undefined) {
    return res.status(400).json({
      message: 'Faltan campos obligatorios'
    });
  }

  const duplicated = db
    .get('reservations')
    .find(reservation =>
      Number(reservation.commonAreaId) === Number(commonAreaId) &&
      reservation.reservationDate === reservationDate &&
      Number(reservation.timeSlot) === Number(timeSlot) &&
      String(reservation.status).toUpperCase() === 'ACTIVE'
    )
    .value();

  if (duplicated) {
    return res.status(409).json({
      message: 'Este horario ya se encuentra reservado, elija otro'
    });
  }

  const newReservation = {
    id: getNextId('reservations'),
    residentId: Number(residentId),
    commonAreaId: Number(commonAreaId),
    reservationDate,
    timeSlot: Number(timeSlot),
    numberOfGuests: Number(req.body.numberOfGuests) || 1,
    status: 'ACTIVE',
    qrCodeAccess: `qr-${Date.now()}`,
    penaltyApplied: false
  };

  db.get('reservations').push(newReservation).write();

  return res.status(201).json(newReservation);
});

// Cancelar reserva
server.post('/reservations/:id/cancelations', (req, res) => {
  const id = Number(req.params.id);

  const reservation = db.get('reservations').find({ id }).value();

  if (!reservation) {
    return res.status(404).json({
      message: 'Reserva no encontrada'
    });
  }

  const updated = db
    .get('reservations')
    .find({ id })
    .assign({ status: 'CANCELLED' })
    .write();

  return res.status(200).json(updated);
});

/* =========================================================
   ASIGNAR TITULAR A UNIDAD (US01 - Escenario 2)
   ========================================================= */

server.post('/residential/user-units', (req, res) => {
  const { idUnit, idUser, startDate, endDate, status, relationType } = req.body;

  if (!idUnit || !idUser) {
    return res.status(400).json({
      message: 'Faltan campos obligatorios'
    });
  }

  const effectiveRelation = String(relationType || 'OWNER').toUpperCase();
  const effectiveStatus = String(status || 'ACTIVE').toUpperCase();

  const userUnits = db.get('userUnits').value();

  const duplicated = userUnits.find(relation =>
    Number(relation.idUser) === Number(idUser) &&
    Number(relation.idUnit) === Number(idUnit)
  );

  if (duplicated) {
    return res.status(409).json({
      message: 'El usuario ya está asignado a esta unidad'
    });
  }

  const activeTitular = userUnits.find(relation =>
    Number(relation.idUnit) === Number(idUnit) &&
    String(relation.status).toUpperCase() === 'ACTIVE' &&
    !relation.endDate &&
    String(relation.relationType || 'OWNER').toUpperCase() === 'OWNER'
  );

  if (effectiveStatus === 'ACTIVE' && effectiveRelation === 'OWNER' && activeTitular) {
    return res.status(409).json({
      message: 'La unidad ya tiene un titular activo'
    });
  }

  const newRelation = {
    id: getNextId('userUnits'),
    idBuilding: req.body.idBuilding ?? null,
    idUnit: Number(idUnit),
    idUser: Number(idUser),
    startDate: startDate ?? new Date().toISOString().slice(0, 19),
    endDate: endDate ?? null,
    status: effectiveStatus,
    relationType: effectiveRelation
  };

  newRelation.idUserUnit = newRelation.id;

  db.get('userUnits').push(newRelation).write();

  return res.status(201).json(newRelation);
});

/* =========================================================
   MOVER RESIDENTE DE UNIDAD
   ========================================================= */

server.put('/residential/user-units/move', (req, res) => {
  const { idUser, newIdUnit, moveDate } = req.body;

  const targetTitular = db
    .get('userUnits')
    .find(relation =>
      Number(relation.idUnit) === Number(newIdUnit) &&
      String(relation.status).toUpperCase() === 'ACTIVE' &&
      !relation.endDate &&
      String(relation.relationType || 'OWNER').toUpperCase() === 'OWNER'
    )
    .value();

  if (targetTitular) {
    return res.status(409).json({
      message: 'La unidad ya tiene un titular activo'
    });
  }

  const current = db
    .get('userUnits')
    .find(relation =>
      Number(relation.idUser) === Number(idUser) &&
      String(relation.status).toUpperCase() === 'ACTIVE'
    )
    .value();

  if (!current) {
    return res.status(404).json({
      message: 'El residente no tiene una unidad activa'
    });
  }

  db.get('userUnits')
    .find({ id: current.id })
    .assign({ status: 'INACTIVE', endDate: moveDate })
    .write();

  const newRelation = {
    id: getNextId('userUnits'),
    idBuilding: current.idBuilding,
    idUnit: Number(newIdUnit),
    idUser: Number(idUser),
    startDate: moveDate,
    endDate: null,
    status: 'ACTIVE',
    relationType: 'OWNER'
  };

  newRelation.idUserUnit = newRelation.id;

  db.get('userUnits').push(newRelation).write();

  return res.status(200).json(newRelation);
});

/* =========================================================
   ROUTE REWRITER
   ========================================================= */

server.use(
  jsonServer.rewriter({
    '/users': '/users',
    '/users/:id': '/users/:id',

    '/roles': '/roles',
    '/roles/:id': '/roles/:id',

    '/residential/buildings': '/buildings',
    '/residential/buildings/:id': '/buildings/:id',

    '/residential/units': '/units',
    '/residential/units/:id': '/units/:id',

    '/residential/user-units': '/userUnits',
    '/residential/user-units/:id': '/userUnits/:id',

    '/residential/buildings/:idBuilding/units':
      '/units?idBuilding=:idBuilding',

    '/residential/buildings/:idBuilding/residents':
      '/userUnits?idBuilding=:idBuilding',

    '/common-areas': '/commonAreas',
    '/common-areas/:id': '/commonAreas/:id',

    '/common-area-rules': '/commonAreaRules',
    '/common-area-rules/:id': '/commonAreaRules/:id',

    '/common-area-rules/common-area/:commonAreaId':
      '/commonAreaRules?commonAreaId=:commonAreaId',

    '/reservations': '/reservations',
    '/reservations/:id': '/reservations/:id',

    '/payments': '/payments',
    '/payments/:id': '/payments/:id',

    '/payments/debts': '/debts',
    '/payments/debts/:id': '/debts/:id',

    '/payments/debts/unit/:unitId':
      '/debts?unitId=:unitId',

    '/payments/user/:userId':
      '/payments?userId=:userId',

    '/payments/user/:userId/year/:year':
      '/payments?userId=:userId&paymentDate_like=:year',

    '/posts': '/posts',
    '/posts/:id': '/posts/:id'
  })
);

server.use(router);

module.exports = server;