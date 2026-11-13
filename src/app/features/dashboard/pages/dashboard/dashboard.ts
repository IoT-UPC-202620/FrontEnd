import {
  Component,
  inject,
  OnInit
} from '@angular/core';

import {
  CommonModule,
  DatePipe
} from '@angular/common';

import { RouterModule } from '@angular/router';

import {
  forkJoin,
  map,
  of,
  switchMap
} from 'rxjs';

import { ReservationService } from
    '../../../reservations/services/reservation.service';

import { CommonAreaService } from
    '../../../reservations/services/common-area.service';

import { BuildingsService } from
    '../../../buildings/services/buildings.service';

import { UnitsService } from
    '../../../buildings/services/units.service';

import { UserUnitsService } from
    '../../../buildings/services/user-units.service';

import { Building } from
    '../../../buildings/model/building.model';

import { Unit } from
    '../../../buildings/model/unit.model';

import { UserUnit } from
    '../../../buildings/model/user-unit.model';

import { DashboardService } from
    '../../services/dashboard.service';

import { IotTelemetryDashboard } from
    '../../../smart-iot/pages/iot-telemetry-dashboard/iot-telemetry-dashboard';

interface BuildingDashboardData {
  building: Building;
  units: Unit[];
  residents: UserUnit[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IotTelemetryDashboard
  ],
  providers: [
    DatePipe
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {

  private reservationService =
    inject(ReservationService);

  private commonAreaService =
    inject(CommonAreaService);

  private buildingsService =
    inject(BuildingsService);

  private unitsService =
    inject(UnitsService);

  private userUnitsService =
    inject(UserUnitsService);

  private dashboardService =
    inject(DashboardService);

  private datePipe =
    inject(DatePipe);

  currentDate = new Date();

  occupancyRate = 0;
  occupiedUnits = 0;
  totalUnits = 0;

  pendingDebtsCount = 0;
  pendingDebtsAmount = 0;

  totalCollected = 0;
  delinquencyRate = 0;

  pendingReservations: any[] = [];
  communityPosts: any[] = [];

  selectedPeriod = '6';

  chartLabels: string[] = [];

  monthlyRevenue: {
    key: string;
    month: string;
    amount: number;
  }[] = [];

  maxRevenue = 1;

  allPayments: any[] = [];
  allDebts: any[] = [];

  ngOnInit(): void {
    this.generateChartLabels();

    /*
     * Carga edificios, unidades y residentes usando
     * el mismo flujo de UnitsResidentsPage.
     */
    this.loadBuildingInformation();

    this.loadReservations();
    this.loadCommunityWall();
  }

  /**
   * Obtiene todos los edificios.
   *
   * Por cada edificio obtiene:
   * - sus unidades;
   * - sus relaciones de residentes.
   *
   * Es el mismo flujo utilizado correctamente
   * en UnitsResidentsPage.
   */
  loadBuildingInformation(): void {
    this.buildingsService
      .getAll()
      .pipe(
        switchMap(buildings => {
          if (buildings.length === 0) {
            return of(
              [] as BuildingDashboardData[]
            );
          }

          const requests = buildings.map(
            building =>
              this.unitsService
                .getByBuildingId(
                  building.idBuilding
                )
                .pipe(
                  switchMap(units =>
                    this.userUnitsService
                      .getResidentsByBuildingId(
                        building.idBuilding
                      )
                      .pipe(
                        map(residents => ({
                          building,
                          units,
                          residents
                        }))
                      )
                  )
                )
          );

          return forkJoin(requests);
        })
      )
      .subscribe({
        next: buildingData => {
          const units = buildingData.flatMap(
            item => item.units
          );

          const residents =
            buildingData.flatMap(
              item => item.residents
            );

          console.log(
            'Edificios del Dashboard:',
            buildingData
          );

          console.log(
            'Unidades del Dashboard:',
            units
          );

          console.log(
            'Residentes del Dashboard:',
            residents
          );

          this.calculateOccupancy(units);

          this.loadFinancials(
            units,
            residents
          );
        },

        error: error => {
          console.error(
            'Error cargando edificios, unidades y residentes:',
            error
          );

          this.resetOccupancy();
          this.resetFinancials();
        }
      });
  }

  /**
   * Calcula las unidades totales y ocupadas.
   */
  private calculateOccupancy(
    units: Unit[]
  ): void {
    this.totalUnits = units.length;

    this.occupiedUnits =
      units.filter(unit =>
        String(unit.status)
          .trim()
          .toUpperCase() ===
        'OCCUPIED'
      ).length;

    this.occupancyRate =
      this.totalUnits === 0
        ? 0
        : Math.round(
          (
            this.occupiedUnits /
            this.totalUnits
          ) * 100
        );

    console.log({
      totalUnits: this.totalUnits,
      occupiedUnits: this.occupiedUnits,
      occupancyRate: this.occupancyRate
    });
  }


  private loadFinancials(
    units: Unit[],
    residents: UserUnit[]
  ): void {
    const unitIds = Array.from(
      new Set(
        units
          .map(unit =>
            Number(unit.idUnit)
          )
          .filter(unitId =>
            unitId > 0
          )
      )
    );

    const residentIds = Array.from(
      new Set(
        residents
          .map(resident =>
            Number(resident.idUser)
          )
          .filter(userId =>
            userId > 0
          )
      )
    );

    const debtRequests =
      unitIds.map(unitId =>
        this.dashboardService
          .getDebtsByUnit(unitId)
          .pipe(
            map(debts =>
              debts.map(debt => ({
                ...debt,


                unitId:
                  debt.unitId ??
                  debt.idUnit ??
                  unitId
              }))
            )
          )
      );

    const paymentRequests =
      residentIds.map(userId =>
        this.dashboardService
          .getPaymentsByUser(userId)
      );

    forkJoin({
      debts:
        debtRequests.length > 0
          ? forkJoin(
            debtRequests
          ).pipe(
            map(groups =>
              groups.flat()
            )
          )
          : of([]),

      payments:
        paymentRequests.length > 0
          ? forkJoin(
            paymentRequests
          ).pipe(
            map(groups =>
              groups.flat()
            )
          )
          : of([])
    }).subscribe({
      next: ({
               debts,
               payments
             }) => {
        this.processFinancialInformation(
          units,
          debts,
          payments
        );
      },

      error: error => {
        console.error(
          'Error cargando deudas y pagos:',
          error
        );

        this.resetFinancials();
      }
    });
  }


  private processFinancialInformation(
    units: Unit[],
    debts: any[],
    payments: any[]
  ): void {
    const unitIds = new Set(
      units.map(unit =>
        Number(unit.idUnit)
      )
    );

    const buildingDebts =
      debts.filter(debt =>
        unitIds.has(
          Number(
            debt.unitId ??
            debt.idUnit ??
            0
          )
        )
      );

    this.allDebts =
      this.removeDuplicates(
        buildingDebts
      );

    const debtIds = new Set(
      this.allDebts.map(debt =>
        Number(debt.id)
      )
    );


    const paymentsWithDebt =
      payments.filter(payment =>
        debtIds.has(
          Number(
            payment.debtId ??
            0
          )
        )
      );


    this.allPayments =
      this.removeDuplicates(
        paymentsWithDebt.length > 0
          ? paymentsWithDebt
          : payments
      );

    this.totalCollected =
      this.allPayments
        .filter(payment =>
          this.isPaidStatus(
            payment.status
          )
        )
        .reduce(
          (sum, payment) =>
            sum +
            Number(
              payment.amount ?? 0
            ),
          0
        );

    const pendingDebts =
      this.allDebts.filter(debt =>
        this.isPendingStatus(
          debt.status
        )
      );

    this.pendingDebtsCount =
      pendingDebts.length;

    this.pendingDebtsAmount =
      pendingDebts.reduce(
        (sum, debt) =>
          sum +
          Number(
            debt.amount ?? 0
          ),
        0
      );

    const expectedAmount =
      this.totalCollected +
      this.pendingDebtsAmount;

    this.delinquencyRate =
      expectedAmount === 0
        ? 0
        : Number(
          (
            (
              this.pendingDebtsAmount /
              expectedAmount
            ) * 100
          ).toFixed(1)
        );

    this.generateChartLabels();
  }

  /**
   * Carga las reservas activas.
   *
   * Se utilizan únicamente las propiedades
   * existentes en Reservation:
   *
   * id
   * residentId
   * commonAreaId
   * reservationDate
   * timeSlot
   * status
   */
  loadReservations(): void {
    forkJoin({
      reservations:
        this.reservationService
          .getAll(),

      commonAreas:
        this.commonAreaService
          .getAll()
    }).subscribe({
      next: ({
               reservations,
               commonAreas
             }) => {
        const activeReservations =
          reservations
            .filter(reservation =>
              String(reservation.status)
                .trim()
                .toUpperCase() ===
              'ACTIVE'
            )
            .slice(0, 3);

        this.pendingReservations =
          activeReservations.map(
            reservation => {
              const area =
                commonAreas.find(
                  currentArea =>
                    Number(currentArea.id) ===
                    Number(
                      reservation.commonAreaId
                    )
                );

              const formattedDay =
                this.datePipe.transform(
                  reservation.reservationDate,
                  'MMM d'
                ) ?? '';

              return {
                ...reservation,

                areaName:
                  area?.name ??
                  'Unknown Area',

                formattedDate:
                  `${formattedDay} • ` +
                  `${reservation.timeSlot}:00`
              };
            }
          );
      },

      error: error => {
        console.error(
          'Error cargando reservas:',
          error
        );

        this.pendingReservations = [];
      }
    });
  }

  /**
   * Carga los posts del muro.
   */
  loadCommunityWall(): void {
    this.dashboardService
      .getPosts()
      .subscribe({
        next: posts => {
          this.communityPosts =
            posts.slice(0, 5);
        },

        error: error => {
          console.error(
            'Error cargando posts:',
            error
          );

          this.communityPosts = [];
        }
      });
  }

  cancelReservation(
    id: number | string
  ): void {
    this.reservationService
      .cancelReservation(id)
      .subscribe({
        next: () => {
          this.pendingReservations =
            this.pendingReservations.filter(
              reservation =>
                Number(reservation.id) !==
                Number(id)
            );

          this.loadReservations();
        },

        error: error => {
          console.error(
            'Error cancelling reservation:',
            error
          );
        }
      });
  }

  setPeriod(
    period: string
  ): void {
    this.selectedPeriod = period;

    this.generateChartLabels();
  }

  /**
   * Genera el gráfico de recaudación mensual.
   */
  generateChartLabels(): void {
    const monthlyMap =
      new Map<string, number>();

    this.allPayments.forEach(
      payment => {
        if (
          !this.isPaidStatus(
            payment.status
          )
        ) {
          return;
        }

        const paymentDate =
          new Date(
            payment.paymentDate
          );

        if (
          Number.isNaN(
            paymentDate.getTime()
          )
        ) {
          return;
        }

        const key =
          this.getMonthKey(
            paymentDate
          );

        monthlyMap.set(
          key,
          (
            monthlyMap.get(key) ??
            0
          ) +
          Number(
            payment.amount ?? 0
          )
        );
      }
    );

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

            month:
              date
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

    this.chartLabels =
      this.monthlyRevenue.map(
        data => data.month
      );

    this.maxRevenue =
      Math.max(
        1,
        ...this.monthlyRevenue.map(
          data => data.amount
        )
      );
  }

  private isPaidStatus(
    status: unknown
  ): boolean {
    const value =
      String(status ?? '')
        .trim()
        .toUpperCase();

    return [
      'PAID',
      'CONFIRMED',
      'COMPLETED',
      'SUCCESS'
    ].includes(value);
  }

  private isPendingStatus(
    status: unknown
  ): boolean {
    const value =
      String(status ?? '')
        .trim()
        .toUpperCase();

    return [
      'PENDING',
      'OVERDUE',
      'UNPAID',
      'PARTIAL'
    ].includes(value);
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

  private removeDuplicates(
    items: any[]
  ): any[] {
    const mapById =
      new Map<string, any>();

    items.forEach(
      (item, index) => {
        const key =
          item.id !== undefined &&
          item.id !== null
            ? String(item.id)
            : `item-${index}`;

        mapById.set(
          key,
          item
        );
      }
    );

    return Array.from(
      mapById.values()
    );
  }

  private resetOccupancy(): void {
    this.totalUnits = 0;
    this.occupiedUnits = 0;
    this.occupancyRate = 0;
  }

  private resetFinancials(): void {
    this.allDebts = [];
    this.allPayments = [];

    this.pendingDebtsCount = 0;
    this.pendingDebtsAmount = 0;

    this.totalCollected = 0;
    this.delinquencyRate = 0;

    this.generateChartLabels();
  }
}
