import {
  Component,
  OnInit,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  Observable,
  catchError,
  forkJoin,
  map,
  of,
  switchMap
} from 'rxjs';

import { FinanceService } from '../../features/finance/services/finance.service';

import {
  AreaFinancialReportResource,
  Building,
  CreateNotificationRequest,
  Debt,
  FinancialReportResource,
  OutstandingBalance,
  Payment,
  Unit,
  User,
  UserUnit
} from '../../features/finance/model/finance.models';

import { MoneyPipe } from '@/shared/core/currency/money.pipe';
import { formatMoney } from '@/shared/core/currency/currency-display.service';

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [
    CommonModule,
    MoneyPipe,
    FormsModule
  ],
  templateUrl: './finance.html',
  styleUrl: './finance.css'
})
export class Finance implements OnInit {
  private readonly financeService =
    inject(FinanceService);


  totalRevenue = 0;
  pendingDues = 0;
  arrears = 0;

  collectionRate = 0;
  overdueRate = 0;


  occupancyRate = 0;
  pendingUnitsCount = 0;


  areaReports: AreaFinancialReportResource[] = [];


  monthlyRevenue: {
    key: string;
    month: string;
    amount: number;
  }[] = [];

  maxRevenue = 1;
  selectedPeriod = '6';

  allPayments: Payment[] = [];


  outstandingBalances: OutstandingBalance[] = [];


  isLoading = false;
  errorMessage = '';

  isModalOpen = false;

  currentPage = 1;
  pageSize = 10;
  searchTerm = '';

  sendingNotificationForDebtId:
    number | null = null;

  currentDate = new Date();

  ngOnInit(): void {
    this.fetchData();
  }


  get filteredBalances(): OutstandingBalance[] {
    const term =
      this.searchTerm.trim().toLowerCase();

    if (!term) {
      return this.outstandingBalances;
    }

    return this.outstandingBalances.filter(
      balance =>
        balance.residentName
          .toLowerCase()
          .includes(term) ||

        balance.unitDetails
          .toLowerCase()
          .includes(term) ||

        balance.unitAndResident
          .toLowerCase()
          .includes(term) ||

        balance.buildingName
          .toLowerCase()
          .includes(term)
    );
  }


  get paginatedBalances(): OutstandingBalance[] {
    const start =
      (this.currentPage - 1) *
      this.pageSize;

    return this.filteredBalances.slice(
      start,
      start + this.pageSize
    );
  }

  get totalPages(): number {
    const pages = Math.ceil(
      this.filteredBalances.length /
      this.pageSize
    );

    return Math.max(pages, 1);
  }

  get showingStart(): number {
    if (this.filteredBalances.length === 0) {
      return 0;
    }

    return (
      (this.currentPage - 1) *
      this.pageSize
    ) + 1;
  }

  get showingEnd(): number {
    return Math.min(
      this.currentPage *
      this.pageSize,

      this.filteredBalances.length
    );
  }


  fetchData(): void {
    const buildingId = this.getBuildingId();

    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      report:
        this.financeService
          .getFinancialReport(buildingId),

      units: this.optionalRequest(
        this.financeService.getUnits(),
        [] as Unit[],
        'unidades'
      ),

      users: this.optionalRequest(
        this.financeService.getUsers(),
        [] as User[],
        'usuarios'
      ),

      userUnits: this.optionalRequest(
        this.financeService.getUserUnits(),
        [] as UserUnit[],
        'relaciones usuario-unidad'
      ),

      buildings: this.optionalRequest(
        this.financeService.getBuildings(),
        [] as Building[],
        'edificios'
      )
    })
      .pipe(
        switchMap(baseData => {
          const buildingUnits =
            this.getUnitsForBuilding(
              baseData.units,
              buildingId
            );

          const residentIds =
            this.getResidentIdsForUnits(
              baseData.userUnits,
              buildingUnits
            );

          return forkJoin({
            report: of(baseData.report),

            units: of(buildingUnits),

            users: of(baseData.users),

            userUnits: of(baseData.userUnits),

            buildings: of(baseData.buildings),


            debts:
              this.loadDebtsForUnits(
                buildingUnits
              ),

            payments:
              this.loadPaymentsForResidents(
                residentIds
              )
          });
        })
      )
      .subscribe({
        next: ({
                 report,
                 units,
                 users,
                 userUnits,
                 buildings,
                 debts,
                 payments
               }) => {

          this.applyFinancialReport(report);


          this.allPayments =
            this.removeDuplicatePayments(
              payments
            );

          this.calculateCharts();


          this.buildOutstandingBalances(
            debts,
            this.allPayments,
            units,
            users,
            userUnits,
            buildings,
            buildingId
          );

          /*
           * Ocupación calculada mediante Units.
           */
          this.calculateOccupancyRate(units);

          /*
           * Cantidad de unidades diferentes
           * con saldo pendiente.
           */
          this.pendingUnitsCount =
            new Set(
              this.outstandingBalances.map(
                balance => balance.unitId
              )
            ).size;

          this.isLoading = false;
        },

        error: error => {
          console.error(
            'Error cargando el reporte financiero:',
            error
          );

          this.errorMessage =
            'No se pudo cargar el reporte financiero. ';

          this.isLoading = false;
        }
      });
  }


  private applyFinancialReport(
    report: FinancialReportResource
  ): void {
    const collectedFromDebts = Number(
      report.totalCollectedFromDebts ?? 0
    );

    const collectedFromReservations = Number(
      report.totalCollectedFromReservations ?? 0
    );

    /*
     * Total Revenue:
     *
     * dinero de deudas +
     * dinero de reservas.
     */
    this.totalRevenue =
      collectedFromDebts +
      collectedFromReservations;

    /*
     * Deuda pendiente total.
     */
    this.pendingDues = Number(
      report.totalDebt ?? 0
    );

    /*
     * Deuda vencida.
     */
    this.arrears = Number(
      report.totalOverdueDebt ?? 0
    );

    /*
     * Porcentaje de recaudación.
     */
    this.collectionRate =
      this.normalizePercentage(
        Number(report.collectionRate ?? 0)
      );

    /*
     * Porcentaje de morosidad enviado
     * por Report.
     */
    this.overdueRate =
      this.normalizePercentage(
        Number(report.overdueRate ?? 0)
      );

    /*
     * Detalle de ingresos y penalidades
     * por área común.
     */
    this.areaReports =
      report.areas ?? [];
  }

  /**
   * Obtiene las deudas usando el endpoint
   * existente por cada unidad.
   */
  private loadDebtsForUnits(
    units: Unit[]
  ): Observable<Debt[]> {
    const unitIds = [
      ...new Set(
        units
          .map(unit => this.getUnitId(unit))
          .filter(unitId => unitId > 0)
      )
    ];

    if (unitIds.length === 0) {
      return of([]);
    }

    const requests = unitIds.map(unitId =>
      this.optionalRequest(
        this.financeService
          .getDebtsByUnit(unitId),

        [] as Debt[],

        `deudas de la unidad ${unitId}`
      ).pipe(
        map(debts =>
          debts.map(debt => ({
            ...debt,

            /*
             * Asegura que la deuda mantenga
             * la unidad consultada aunque
             * el backend no envíe unitId.
             */
            unitId:
              debt.unitId ??
              debt.idUnit ??
              unitId
          }))
        )
      )
    );

    return forkJoin(requests).pipe(
      map(groups =>
        this.removeDuplicateDebts(
          groups.flat()
        )
      )
    );
  }

  /**
   * Obtiene los pagos usando el endpoint
   * existente por cada usuario.
   */
  private loadPaymentsForResidents(
    residentIds: number[]
  ): Observable<Payment[]> {
    const uniqueResidentIds = [
      ...new Set(
        residentIds.filter(
          residentId =>
            residentId > 0
        )
      )
    ];

    if (uniqueResidentIds.length === 0) {
      return of([]);
    }

    const requests =
      uniqueResidentIds.map(residentId =>
        this.optionalRequest(
          this.financeService
            .getPaymentsByUser(residentId),

          [] as Payment[],

          `pagos del usuario ${residentId}`
        ).pipe(
          map(payments =>
            payments.map(payment => ({
              ...payment,

              /*
               * Asegura que cada pago tenga
               * el usuario consultado.
               */
              userId:
                payment.userId ??
                payment.idUser ??
                residentId
            }))
          )
        )
      );

    return forkJoin(requests).pipe(
      map(groups =>
        this.removeDuplicatePayments(
          groups.flat()
        )
      )
    );
  }

  /**
   * Construye la tabla:
   *
   * Residents with Outstanding Balances.
   */
  private buildOutstandingBalances(
    debts: Debt[],
    payments: Payment[],
    units: Unit[],
    users: User[],
    userUnits: UserUnit[],
    buildings: Building[],
    buildingId: number
  ): void {
    const pendingDebts = debts.filter(
      debt =>
        this.isPendingDebt(debt.status)
    );

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    this.outstandingBalances =
      pendingDebts
        .map(debt => {
          const debtId =
            Number(debt.id);

          const unitId =
            this.getDebtUnitId(debt);

          const unit = units.find(
            currentUnit =>
              this.getUnitId(currentUnit) ===
              unitId
          );

          const relationsForUnit =
            userUnits.filter(
              relation =>
                this.getUserUnitUnitId(
                  relation
                ) === unitId
            );

          const activeRelation =
            relationsForUnit.find(
              relation =>
                !relation.status ||
                relation.status.toUpperCase() ===
                'ACTIVE'
            ) ??
            relationsForUnit[0];

          const residentId =
            activeRelation
              ? this.getUserUnitUserId(
                activeRelation
              )
              : null;

          const user =
            residentId !== null
              ? users.find(
                currentUser =>
                  this.getUserId(
                    currentUser
                  ) === residentId
              )
              : undefined;

          const residentName =
            this.getUserName(user);

          const unitNumber =
            this.getUnitNumber(unit);

          const unitBuildingId =
            unit
              ? this.getUnitBuildingId(unit) ??
              buildingId
              : buildingId;

          const building =
            buildings.find(
              currentBuilding =>
                this.getBuildingEntityId(
                  currentBuilding
                ) === unitBuildingId
            );

          const buildingName =
            this.getBuildingName(building);

          /*
           * Pagos asociados directamente
           * con esta deuda.
           */
          const debtPayments =
            payments.filter(
              payment =>
                this.getPaymentDebtId(
                  payment
                ) === debtId &&
                this.isSuccessfulPayment(
                  payment.status
                )
            );

          /*
           * Pagos generales del residente,
           * usados como respaldo para mostrar
           * la fecha del último pago.
           */
          const residentPayments =
            residentId === null
              ? []
              : payments.filter(
                payment =>
                  this.getPaymentUserId(
                    payment
                  ) === residentId &&
                  this.isSuccessfulPayment(
                    payment.status
                  )
              );

          const paidForDebt =
            debtPayments.reduce(
              (sum, payment) =>
                sum +
                Number(
                  payment.amount ?? 0
                ),
              0
            );

          const debtAmount =
            Number(debt.amount ?? 0);

          const amountDue = Math.max(
            0,
            debtAmount - paidForDebt
          );

          const paymentsForLastDate =
            debtPayments.length > 0
              ? debtPayments
              : residentPayments;

          const orderedPayments =
            [...paymentsForLastDate].sort(
              (first, second) =>
                this.getDateTimestamp(
                  second.paymentDate
                ) -
                this.getDateTimestamp(
                  first.paymentDate
                )
            );

          const lastPaymentDate =
            orderedPayments.length > 0
              ? this.formatDate(
                orderedPayments[0]
                  .paymentDate
              )
              : 'No payments';

          const dueDate =
            new Date(debt.dueDate);

          dueDate.setHours(0, 0, 0, 0);

          const validDueDate =
            !Number.isNaN(
              dueDate.getTime()
            );

          const isOverdue =
            validDueDate &&
            dueDate.getTime() <
            today.getTime();

          const overdueDays =
            isOverdue
              ? Math.max(
                1,
                Math.ceil(
                  (
                    today.getTime() -
                    dueDate.getTime()
                  ) /
                  (
                    1000 *
                    60 *
                    60 *
                    24
                  )
                )
              )
              : 0;

          const balance:
            OutstandingBalance = {
            debtId,
            residentId,
            unitId,

            unitAndResident:
              `Unit ${unitNumber} - ` +
              `${residentName}`,

            residentName,

            initials:
              this.getInitials(
                residentName
              ),

            unitDetails:
              `Unit ${unitNumber}`,

            buildingName,

            status: isOverdue
              ? `OVERDUE ${overdueDays} DAYS`
              : 'GRACE PERIOD',

            statusClass: isOverdue
              ? 'status-overdue'
              : 'status-grace',

            lastPaymentDate,

            amountDue
          };

          return balance;
        })
        /*
         * No muestra una deuda que ya fue
         * completamente pagada.
         */
        .filter(
          balance =>
            balance.amountDue > 0
        )
        /*
         * Ordena primero las vencidas.
         */
        .sort((first, second) => {
          const firstOverdue =
            first.statusClass ===
            'status-overdue'
              ? 0
              : 1;

          const secondOverdue =
            second.statusClass ===
            'status-overdue'
              ? 0
              : 1;

          return (
            firstOverdue -
            secondOverdue
          );
        });

    this.currentPage = 1;
  }

  /**
   * Genera el gráfico mensual mediante
   * los pagos de los residentes.
   */
  calculateCharts(): void {
    const monthlyMap =
      new Map<string, number>();

    this.allPayments.forEach(payment => {
      if (
        !this.isSuccessfulPayment(
          payment.status
        )
      ) {
        return;
      }

      const paymentDate =
        new Date(payment.paymentDate);

      if (
        Number.isNaN(
          paymentDate.getTime()
        )
      ) {
        return;
      }

      const key =
        this.getMonthKey(paymentDate);

      const currentAmount =
        monthlyMap.get(key) ?? 0;

      monthlyMap.set(
        key,
        currentAmount +
        Number(payment.amount ?? 0)
      );
    });

    const monthsCount =
      Number.parseInt(
        this.selectedPeriod,
        10
      ) || 6;

    const today = new Date();

    this.monthlyRevenue =
      Array.from(
        {
          length: monthsCount
        },
        (_, index) => {
          const monthsAgo =
            monthsCount -
            index -
            1;

          const date = new Date(
            today.getFullYear(),
            today.getMonth() -
            monthsAgo,
            1
          );

          const key =
            this.getMonthKey(date);

          return {
            key,

            month: date
              .toLocaleString(
                'en-US',
                {
                  month: 'short'
                }
              )
              .toUpperCase(),

            amount:
              monthlyMap.get(key) ??
              0
          };
        }
      );

    const amounts =
      this.monthlyRevenue.map(
        item => item.amount
      );

    this.maxRevenue = Math.max(
      ...amounts,
      1
    );
  }

  /**
   * Calcula la ocupación usando únicamente
   * las unidades del edificio.
   */
  private calculateOccupancyRate(
    units: Unit[]
  ): void {
    const occupiedUnits =
      units.filter(
        unit =>
          unit.status
            ?.toUpperCase() ===
          'OCCUPIED'
      ).length;

    this.occupancyRate =
      units.length === 0
        ? 0
        : Number(
          (
            (
              occupiedUnits /
              units.length
            ) *
            100
          ).toFixed(1)
        );
  }

  /**
   * Devuelve solamente las unidades
   * correspondientes al edificio.
   *
   * Si el backend no envía buildingId,
   * conserva todas las unidades como respaldo.
   */
  private getUnitsForBuilding(
    units: Unit[],
    buildingId: number
  ): Unit[] {
    const unitsWithBuilding =
      units.filter(
        unit =>
          this.getUnitBuildingId(
            unit
          ) !== null
      );

    if (unitsWithBuilding.length === 0) {
      return units;
    }

    return units.filter(
      unit =>
        this.getUnitBuildingId(unit) ===
        buildingId
    );
  }

  /**
   * Obtiene los residentes asociados
   * con las unidades del edificio.
   */
  private getResidentIdsForUnits(
    userUnits: UserUnit[],
    units: Unit[]
  ): number[] {
    const unitIds =
      new Set(
        units.map(
          unit =>
            this.getUnitId(unit)
        )
      );

    return [
      ...new Set(
        userUnits
          .filter(
            relation =>
              unitIds.has(
                this.getUserUnitUnitId(
                  relation
                )
              )
          )
          .map(
            relation =>
              this.getUserUnitUserId(
                relation
              )
          )
          .filter(
            residentId =>
              residentId !== null &&
              residentId > 0
          )
      )
    ] as number[];
  }

  /**
   * Las solicitudes auxiliares no cancelan
   * el reporte si devuelven error.
   */
  private optionalRequest<T>(
    request: Observable<T>,
    fallback: T,
    requestName: string
  ): Observable<T> {
    return request.pipe(
      catchError(error => {
        console.error(
          `Error cargando ${requestName}:`,
          {
            status: error.status,
            message: error.message,
            error: error.error
          }
        );

        return of(fallback);
      })
    );
  }

  sendNotice(
    balance: OutstandingBalance
  ): void {
    if (balance.residentId === null) {
      alert(
        'No se encontró el usuario asociado a esta deuda.'
      );

      return;
    }

    const request:
      CreateNotificationRequest = {
      userId: balance.residentId,

      title:
        'Outstanding payment notice',

      content:
        `You have an outstanding balance of ` +
        `${formatMoney(balance.amountDue, 'PEN')} ` +
        `for ${balance.unitDetails} in ` +
        `${balance.buildingName}.`
    };

    this.sendingNotificationForDebtId =
      balance.debtId;

    this.financeService
      .sendNotification(request)
      .subscribe({
        next: () => {
          this.sendingNotificationForDebtId =
            null;

          alert(
            `Notification sent successfully ` +
            `to ${balance.residentName}.`
          );
        },

        error: error => {
          console.error(
            'Error enviando la notificación:',
            error
          );

          this.sendingNotificationForDebtId =
            null;

          alert(
            'No se pudo enviar la notificación.'
          );
        }
      });
  }

  onSearch(event: Event): void {
    const input =
      event.target as HTMLInputElement;

    this.searchTerm =
      input.value;

    this.currentPage = 1;
  }

  onPeriodChange(): void {
    this.calculateCharts();
  }

  nextPage(): void {
    if (
      this.currentPage <
      this.totalPages
    ) {
      this.currentPage++;
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToPage(page: number): void {
    if (
      page >= 1 &&
      page <= this.totalPages
    ) {
      this.currentPage = page;
    }
  }

  openModal(): void {
    this.isModalOpen = true;
    this.searchTerm = '';
    this.currentPage = 1;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.searchTerm = '';
    this.currentPage = 1;
  }

  getInitials(name: string): string {
    if (
      !name ||
      name.toLowerCase() ===
      'unknown'
    ) {
      return 'UN';
    }

    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length >= 2) {
      return (
        parts[0].charAt(0) +
        parts[1].charAt(0)
      ).toUpperCase();
    }

    return name
      .substring(0, 2)
      .toUpperCase();
  }

  /**
   * Obtiene buildingId desde localStorage.
   */
  private getBuildingId(): number {
    const directBuildingId =
      localStorage.getItem(
        'buildingId'
      );

    if (directBuildingId) {
      const parsedId =
        Number(directBuildingId);

      if (!Number.isNaN(parsedId)) {
        return parsedId;
      }
    }

    const storedUser =
      localStorage.getItem(
        'currentUser'
      ) ??
      localStorage.getItem(
        'user'
      ) ??
      localStorage.getItem(
        'authUser'
      );

    if (storedUser) {
      try {
        const user =
          JSON.parse(storedUser);

        const parsedId = Number(
          user.buildingId ??
          user.idBuilding ??
          user.building?.id
        );

        if (!Number.isNaN(parsedId)) {
          return parsedId;
        }
      } catch (error) {
        console.error(
          'No se pudo leer el usuario de localStorage:',
          error
        );
      }
    }

    /*
     * Respaldo temporal.
     */
    return 1;
  }

  private normalizePercentage(
    value: number
  ): number {
    if (!Number.isFinite(value)) {
      return 0;
    }

    /*
     * Soporta:
     *
     * 0.75 = 75 %
     * 75   = 75 %
     */
    const percentage =
      value > 0 &&
      value <= 1
        ? value * 100
        : value;

    return Number(
      Math.min(
        100,
        Math.max(
          0,
          percentage
        )
      ).toFixed(1)
    );
  }

  private getMonthKey(
    date: Date
  ): string {
    return (
      `${date.getFullYear()}-` +
      `${String(
        date.getMonth() + 1
      ).padStart(2, '0')}`
    );
  }

  private formatDate(
    dateValue: string
  ): string {
    const date =
      new Date(dateValue);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return 'Invalid date';
    }

    return date.toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }
    );
  }

  private getDateTimestamp(
    dateValue: string
  ): number {
    const timestamp =
      new Date(dateValue).getTime();

    return Number.isNaN(timestamp)
      ? 0
      : timestamp;
  }

  private isPendingDebt(
    status?: string
  ): boolean {
    const normalizedStatus =
      status?.toUpperCase() ?? '';

    return [
      'PENDING',
      'OVERDUE',
      'UNPAID',
      'PARTIAL'
    ].includes(normalizedStatus);
  }

  private isSuccessfulPayment(
    status?: string
  ): boolean {
    const normalizedStatus =
      status?.toUpperCase() ?? '';

    return [
      'PAID',
      'CONFIRMED',
      'COMPLETED',
      'SUCCESS'
    ].includes(normalizedStatus);
  }

  private removeDuplicateDebts(
    debts: Debt[]
  ): Debt[] {
    const mapById =
      new Map<number, Debt>();

    debts.forEach(debt => {
      const id = Number(debt.id);

      if (!Number.isNaN(id)) {
        mapById.set(id, debt);
      }
    });

    return Array.from(
      mapById.values()
    );
  }

  private removeDuplicatePayments(
    payments: Payment[]
  ): Payment[] {
    const mapById =
      new Map<number, Payment>();

    payments.forEach(payment => {
      const id = Number(payment.id);

      if (!Number.isNaN(id)) {
        mapById.set(id, payment);
      }
    });

    return Array.from(
      mapById.values()
    );
  }

  private getUnitId(
    unit: Unit
  ): number {
    return Number(
      unit.idUnit ??
      unit.id ??
      0
    );
  }

  private getDebtUnitId(
    debt: Debt
  ): number {
    return Number(
      debt.unitId ??
      debt.idUnit ??
      0
    );
  }

  private getPaymentDebtId(
    payment: Payment
  ): number {
    return Number(
      payment.debtId ??
      payment.idDebt ??
      0
    );
  }

  private getPaymentUserId(
    payment: Payment
  ): number {
    return Number(
      payment.userId ??
      payment.idUser ??
      0
    );
  }

  private getUnitBuildingId(
    unit: Unit
  ): number | null {
    const value =
      unit.idBuilding ??
      unit.buildingId;

    if (
      value === undefined ||
      value === null
    ) {
      return null;
    }

    const parsedValue =
      Number(value);

    return Number.isNaN(parsedValue)
      ? null
      : parsedValue;
  }

  private getUserUnitUnitId(
    userUnit: UserUnit
  ): number {
    return Number(
      userUnit.idUnit ??
      userUnit.unitId ??
      0
    );
  }

  private getUserUnitUserId(
    userUnit: UserUnit
  ): number | null {
    const value =
      userUnit.idUser ??
      userUnit.userId ??
      userUnit.residentId;

    if (
      value === undefined ||
      value === null
    ) {
      return null;
    }

    const parsedValue =
      Number(value);

    return Number.isNaN(parsedValue)
      ? null
      : parsedValue;
  }

  private getUserId(
    user: User
  ): number {
    return Number(
      user.idUser ??
      user.id ??
      0
    );
  }

  private getUserName(
    user?: User
  ): string {
    if (!user) {
      return 'Unknown';
    }

    return (
      user.fullName ??
      user.name ??
      user.email ??
      'Unknown'
    );
  }

  private getUnitNumber(
    unit?: Unit
  ): string {
    if (!unit) {
      return 'N/A';
    }

    return String(
      unit.unitNumber ??
      unit.number ??
      unit.name ??
      'N/A'
    );
  }

  private getBuildingEntityId(
    building: Building
  ): number {
    return Number(
      building.idBuilding ??
      building.id ??
      0
    );
  }

  private getBuildingName(
    building?: Building
  ): string {
    if (!building) {
      return 'Unknown building';
    }

    return (
      building.name ??
      building.buildingName ??
      'Unknown building'
    );
  }
}
