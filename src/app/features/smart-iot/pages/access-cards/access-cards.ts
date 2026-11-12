import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject, Subscription, interval, takeUntil } from 'rxjs';

import { User } from '../../../users/model/user.model';
import { UsersService } from '../../../users/services/users.service';
import { UserUnitsService } from '../../../../features/buildings/services/user-units.service';
import {
  AccessCredential,
  CardEnrollment,
  CardFilter,
  RfidReaderDevice
} from '../../model/access-cards.model';
import { AccessCardsService } from '../../services/access-cards.service';

const ENROLLMENT_POLL_MS = 1500;
const COUNTDOWN_TICK_MS = 1000;

type PendingConfirmAction = 'LOST' | 'REVOKED';

@Component({
  selector: 'app-access-cards',
  standalone: true,
  imports: [CommonModule, RouterLink],
  providers: [DatePipe],
  templateUrl: './access-cards.html',
  styleUrl: './access-cards.css'
})
export class TarjetaAccessCards implements OnInit, OnDestroy {
  private readonly accessCardsService = inject(AccessCardsService);
  private readonly usersService = inject(UsersService);
  private readonly userUnitsService = inject(UserUnitsService);
  private readonly datePipe = inject(DatePipe);

  readonly buildingId = this.accessCardsService.getBuildingId();

  credentials: AccessCredential[] = [];
  usersById = new Map<number, User>();
  isLoading = true;
  credentialsLoaded = false;
  errorMessage = '';
  bannerMessage = '';
  bannerTone: 'error' | 'info' = 'info';
  filter: CardFilter = 'all';
  busyCredentialId: number | null = null;
  openActionsId: number | null = null;
  pendingConfirm: { credentialId: number; action: PendingConfirmAction } | null = null;

  readers: RfidReaderDevice[] = [];
  readersLoaded = false;
  readersPickerOpen = false;

  enrolling = false;
  enrollment: CardEnrollment | null = null;
  enrollmentDeviceId: number | null = null;
  enrollmentSecondsLeft = 0;
  enrollmentError = '';

  residents: User[] = [];
  loadingResidents = false;
  selectedUserId: number | null = null;
  creatingCredential = false;

  private readonly destroy$ = new Subject<void>();
  private pollSubscription: Subscription | null = null;
  private countdownSubscription: Subscription | null = null;

  ngOnInit(): void {
    this.loadCredentials();
    this.loadReaders();
  }

  ngOnDestroy(): void {
    // Si la página se cierra con la sesión de registro abierta, el lector no debe quedarse en modo registro.
    const deviceId = this.enrollmentDeviceId;
    const wasActive = this.enrollment?.status.toUpperCase() === 'ACTIVE';

    this.stopEnrollmentTimers();
    this.destroy$.next();
    this.destroy$.complete();

    if (wasActive && deviceId != null) {
      this.accessCardsService.cancelEnrollment(deviceId).subscribe({ error: () => undefined });
    }
  }

  loadCredentials(): void {
    this.isLoading = !this.credentialsLoaded;
    this.errorMessage = '';

    this.accessCardsService.getCredentials(this.buildingId).subscribe({
      next: credentials => {
        this.credentials = credentials;
        this.credentialsLoaded = true;
        this.isLoading = false;
        this.loadUsers();
      },
      error: error => {
        console.error('Error cargando tarjetas:', error);
        this.errorMessage = 'No se pudieron cargar las tarjetas de acceso.';
        this.isLoading = false;
      }
    });
  }

  private loadUsers(): void {
    // Los usuarios solo enriquecen la lista: si el IAM falla se muestra el titular guardado.
    this.usersService.getAll().subscribe({
      next: users => {
        this.usersById = new Map((users ?? []).map(user => [user.id, user]));
      },
      error: error => console.error('Error cargando usuarios del IAM:', error)
    });
  }

  private loadReaders(): void {
    this.accessCardsService.getOnlineRfidReaders(this.buildingId).subscribe({
      next: readers => {
        this.readers = readers;
        this.readersLoaded = true;
      },
      error: error => {
        console.error('Error cargando lectores RFID:', error);
        this.readers = [];
        this.readersLoaded = true;
      }
    });
  }

  get visibleCredentials(): AccessCredential[] {
    const filtered = this.credentials.filter(credential => {
      const active = credential.status.toUpperCase() === 'ACTIVE';

      if (this.filter === 'active') {
        return active;
      }

      if (this.filter === 'inactive') {
        return !active;
      }

      return true;
    });

    return [...filtered].sort((first, second) => {
      const byStatus = this.statusRank(first.status) - this.statusRank(second.status);

      if (byStatus !== 0) {
        return byStatus;
      }

      return this.holderOf(first).toLowerCase().localeCompare(this.holderOf(second).toLowerCase());
    });
  }

  get activeCount(): number {
    return this.credentials.filter(credential => credential.status.toUpperCase() === 'ACTIVE').length;
  }

  get inactiveCount(): number {
    return this.credentials.length - this.activeCount;
  }

  setFilter(filter: CardFilter): void {
    this.filter = filter;
  }

  holderOf(credential: AccessCredential): string {
    const name = credential.holderName?.trim();

    if (name) {
      return name;
    }

    return this.userOf(credential)?.fullName ?? 'Sin titular';
  }

  userOf(credential: AccessCredential): User | null {
    if (credential.userId == null) {
      return null;
    }

    return this.usersById.get(credential.userId) ?? null;
  }

  roleOf(user: User | null): string | null {
    if (!user) {
      return null;
    }

    const normalized = (user.roles ?? []).map(role => role.toUpperCase().replace(/^ROLE_/, ''));

    if (normalized.some(role => role.includes('ADMIN'))) {
      return 'Administrador';
    }

    if (normalized.some(role => role === 'OWNER')) {
      return 'Propietario';
    }

    if (normalized.some(role => role === 'TENANT')) {
      return 'Inquilino';
    }

    return null;
  }

  cardDetails(credential: AccessCredential): string {
    const user = this.userOf(credential);
    const parts: string[] = [];

    if (user?.email) {
      parts.push(user.email);
    }

    const role = this.roleOf(user);

    if (role) {
      parts.push(role);
    }

    return parts.join(' · ');
  }

  statusLabel(status: string): string {
    switch (status.toUpperCase()) {
      case 'ACTIVE': return 'Activa';
      case 'SUSPENDED': return 'Suspendida';
      case 'LOST': return 'Perdida';
      case 'REVOKED': return 'Revocada';
      default: return status;
    }
  }

  statusChipClass(status: string): string {
    switch (status.toUpperCase()) {
      case 'ACTIVE': return 'chip chip-active';
      case 'SUSPENDED': return 'chip chip-suspended';
      case 'LOST': return 'chip chip-lost';
      case 'REVOKED': return 'chip chip-revoked';
      default: return 'chip chip-neutral';
    }
  }

  isActive(credential: AccessCredential): boolean {
    return credential.status.toUpperCase() === 'ACTIVE';
  }

  toggleActions(credential: AccessCredential): void {
    this.openActionsId = this.openActionsId === credential.id ? null : credential.id;
    this.pendingConfirm = null;
  }

  requestStatusChange(credential: AccessCredential, action: PendingConfirmAction): void {
    this.pendingConfirm = { credentialId: credential.id, action };
  }

  cancelPendingConfirm(): void {
    this.pendingConfirm = null;
  }

  confirmPendingAction(credential: AccessCredential): void {
    if (!this.pendingConfirm) {
      return;
    }

    const action = this.pendingConfirm.action;
    this.pendingConfirm = null;
    this.changeStatus(credential, action);
  }

  changeStatus(credential: AccessCredential, status: string): void {
    if (this.busyCredentialId != null) {
      return;
    }

    this.busyCredentialId = credential.id;
    this.bannerMessage = '';

    this.accessCardsService.changeStatus(credential.id, status).subscribe({
      next: updated => {
        this.credentials = this.credentials.map(item => item.id === updated.id ? updated : item);
        this.busyCredentialId = null;
        this.openActionsId = null;
        this.showBanner(`Tarjeta ${updated.rfidUid}: ${this.statusLabel(updated.status).toLowerCase()}.`, 'info');
      },
      error: error => {
        console.error('Error cambiando estado de la tarjeta:', error);
        this.busyCredentialId = null;
        this.showBanner(error?.message ?? 'No se pudo cambiar el estado de la tarjeta.', 'error');
      }
    });
  }

  onRegisterClick(): void {
    if (this.readers.length === 0) {
      return;
    }

    if (this.readers.length === 1) {
      this.beginEnrollment(this.readers[0]);
      return;
    }

    this.readersPickerOpen = !this.readersPickerOpen;
  }

  pickReader(reader: RfidReaderDevice): void {
    this.readersPickerOpen = false;
    this.beginEnrollment(reader);
  }

  beginEnrollment(reader: RfidReaderDevice): void {
    if (this.enrolling || this.enrollment?.status.toUpperCase() === 'ACTIVE') {
      return;
    }

    this.enrolling = true;
    this.enrollment = null;
    this.enrollmentError = '';
    this.enrollmentDeviceId = reader.id;
    this.enrollmentSecondsLeft = 0;
    this.readersPickerOpen = false;
    this.resetCaptureState();
    this.loadResidents();

    this.accessCardsService.startEnrollment(reader.id).subscribe({
      next: session => {
        this.enrolling = false;
        this.enrollment = session;
        this.enrollmentSecondsLeft = this.remainingSeconds(session.expiresAt);
        this.startEnrollmentPolling(reader.id);
      },
      error: error => {
        console.error('Error iniciando el modo registro:', error);
        this.enrolling = false;
        this.enrollmentError = error?.message ?? 'No se pudo iniciar el modo registro en el lector.';
      }
    });
  }

  cancelEnrollmentMode(): void {
    const deviceId = this.enrollmentDeviceId;
    const wasActive = this.enrollment?.status.toUpperCase() === 'ACTIVE';

    this.stopEnrollmentTimers();
    this.enrollment = null;
    this.enrolling = false;
    this.enrollmentError = '';
    this.enrollmentSecondsLeft = 0;
    this.resetCaptureState();

    if (wasActive && deviceId != null) {
      this.accessCardsService.cancelEnrollment(deviceId).subscribe({
        error: error => console.error('Error cancelando el modo registro:', error)
      });
    }
  }

  captureAnother(): void {
    const reader = this.readers.find(item => item.id === this.enrollmentDeviceId) ?? this.readers[0];

    this.enrollment = null;
    this.enrollmentError = '';
    this.resetCaptureState();

    if (reader) {
      this.beginEnrollment(reader);
    }
  }

  closeEnrollment(): void {
    this.stopEnrollmentTimers();
    this.enrollment = null;
    this.enrollmentError = '';
    this.enrollmentSecondsLeft = 0;
    this.resetCaptureState();
  }

  onSelectUser(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedUserId = value ? Number(value) : null;
    this.enrollmentError = '';
  }

  get canAssignCard(): boolean {
    const enrollment = this.enrollment;

    if (!enrollment || enrollment.status.toUpperCase() !== 'CAPTURED') {
      return false;
    }

    if (!enrollment.capturedUid) {
      return false;
    }

    if (enrollment.existingCredential && !this.isRetiredCredential(enrollment.existingCredential.status)) {
      return false;
    }

    return this.selectedUserId != null && !this.creatingCredential;
  }

  get capturedExistingTone(): 'none' | 'active' | 'retired' {
    const enrollment = this.enrollment;

    if (!enrollment) {
      return 'none';
    }

    return this.existingToneOf(enrollment);
  }

  get isCaptured(): boolean {
    return this.enrollment?.status.toUpperCase() === 'CAPTURED';
  }

  get isEnrollmentExpired(): boolean {
    const status = this.enrollment?.status.toUpperCase();

    return status === 'EXPIRED' || status === 'CANCELLED';
  }

  get existingCredentialHolder(): string {
    return this.enrollment?.existingCredential?.holderName ?? 'un residente';
  }

  get existingCredentialStatusLabel(): string {
    return this.statusLabel(this.enrollment?.existingCredential?.status ?? 'ACTIVE').toLowerCase();
  }

  isRetiredCredential(status: string | null | undefined): boolean {
    const normalized = status?.toUpperCase();

    return normalized === 'REVOKED' || normalized === 'LOST';
  }

  assignCapturedCard(): void {
    const enrollment = this.enrollment;

    if (!enrollment || !this.canAssignCard) {
      return;
    }

    const selected = this.residents.find(user => user.id === this.selectedUserId);

    if (!selected) {
      return;
    }

    this.creatingCredential = true;
    this.enrollmentError = '';

    this.accessCardsService.createCredential({
      rfidUid: enrollment.capturedUid as string,
      buildingId: enrollment.buildingId || this.buildingId,
      userId: selected.id,
      holderName: selected.fullName
    }).subscribe({
      next: () => {
        this.creatingCredential = false;
        this.enrollment = null;
        this.enrollmentSecondsLeft = 0;
        this.resetCaptureState();
        this.showBanner(`Tarjeta asociada a ${selected.fullName}.`, 'info');
        this.loadCredentials();
      },
      error: error => {
        console.error('Error asociando la tarjeta:', error);
        this.creatingCredential = false;
        this.enrollmentError = error?.message ?? 'No se pudo asociar la tarjeta.';
      }
    });
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }

    return this.datePipe.transform(value, 'dd/MM/yyyy') ?? value;
  }

  trackByCredential(_: number, credential: AccessCredential): number {
    return credential.id;
  }

  trackByReader(_: number, reader: RfidReaderDevice): number {
    return reader.id;
  }

  trackByUser(_: number, user: User): number {
    return user.id;
  }

  private loadResidents(): void {
    // Primero los residentes del edificio; si Residential falla se usa la lista general de usuarios.
    this.loadingResidents = true;

    this.usersService.getAll().subscribe({
      next: users => {
        const allUsers = users ?? [];

        this.userUnitsService.getByBuildingId(this.buildingId).subscribe({
          next: units => {
            const residentIds = new Set((units ?? []).map(unit => unit.idUser));
            const inBuilding = allUsers.filter(user => residentIds.has(user.id));
            const others = allUsers.filter(user => !residentIds.has(user.id));

            this.applyResidents([...inBuilding, ...others]);
          },
          error: error => {
            console.error('Error cargando residentes del edificio:', error);
            this.applyResidents(allUsers);
          }
        });
      },
      error: error => {
        console.error('Error cargando usuarios del IAM:', error);
        this.loadingResidents = false;
        this.enrollmentError = 'No se pudieron cargar los usuarios para asociar la tarjeta.';
      }
    });
  }

  private applyResidents(candidates: User[]): void {
    this.residents = candidates;
    // No pisar el mapa completo: usuarios fuera de la lista de residentes siguen siendo necesarios como titular.
    this.usersById = new Map([...this.usersById, ...candidates.map(user => [user.id, user] as [number, User])]);
    this.loadingResidents = false;

    if (this.selectedUserId == null) {
      this.selectedUserId = this.defaultHolder(candidates);
    }
  }

  private defaultHolder(users: User[]): number | null {
    for (const user of users) {
      if (!this.isAdminUser(user)) {
        return user.id;
      }
    }

    return users[0]?.id ?? null;
  }

  private isAdminUser(user: User): boolean {
    return (user.roles ?? []).some(role =>
      role.toUpperCase().replace(/^ROLE_/, '').includes('ADMIN')
    );
  }

  private startEnrollmentPolling(deviceId: number): void {
    this.stopEnrollmentTimers();

    this.pollSubscription = interval(ENROLLMENT_POLL_MS)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.pollEnrollment(deviceId));

    this.countdownSubscription = interval(COUNTDOWN_TICK_MS)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.enrollment) {
          return;
        }

        this.enrollmentSecondsLeft = Math.max(0, this.remainingSeconds(this.enrollment.expiresAt));
      });
  }

  private pollEnrollment(deviceId: number): void {
    this.accessCardsService.getEnrollment(deviceId).subscribe({
      next: latest => {
        if (!latest) {
          const hadSession = this.enrollment != null;

          this.stopEnrollmentTimers();
          this.enrollment = null;
          this.enrollmentSecondsLeft = 0;

          if (hadSession) {
            this.showBanner('La sesión de registro ya no está activa.', 'info');
          }

          return;
        }

        const status = latest.status.toUpperCase();

        if (status === 'CAPTURED') {
          this.stopEnrollmentTimers();
          this.enrollment = latest;
          this.enrollmentSecondsLeft = 0;

          if (this.selectedUserId == null) {
            this.selectedUserId = this.defaultHolder(this.residents);
          }

          return;
        }

        if (status === 'EXPIRED' || status === 'CANCELLED') {
          this.stopEnrollmentTimers();
          this.enrollment = latest;
          this.enrollmentSecondsLeft = 0;
          return;
        }

        const remaining = this.remainingSeconds(latest.expiresAt);

        if (remaining <= 0) {
          this.stopEnrollmentTimers();
          this.enrollment = { ...latest, status: 'EXPIRED' };
          this.enrollmentSecondsLeft = 0;
          return;
        }

        this.enrollment = latest;
        this.enrollmentSecondsLeft = remaining;
      },
      error: error => {
        console.error('Error consultando el modo registro:', error);
        this.stopEnrollmentTimers();
        this.enrollmentError = error?.message ?? 'No se pudo consultar el lector.';
      }
    });
  }

  private existingToneOf(enrollment: CardEnrollment): 'none' | 'active' | 'retired' {
    const existing = enrollment.existingCredential;

    if (!existing) {
      return 'none';
    }

    return this.isRetiredCredential(existing.status) ? 'retired' : 'active';
  }

  private stopEnrollmentTimers(): void {
    this.pollSubscription?.unsubscribe();
    this.pollSubscription = null;
    this.countdownSubscription?.unsubscribe();
    this.countdownSubscription = null;
  }

  private resetCaptureState(): void {
    this.selectedUserId = null;
    this.creatingCredential = false;
  }

  private remainingSeconds(expiresAt: string): number {
    const end = Date.parse(expiresAt);

    if (Number.isNaN(end)) {
      return 60;
    }

    return Math.min(60, Math.max(0, Math.floor((end - Date.now()) / 1000)));
  }

  private statusRank(status: string): number {
    switch (status.toUpperCase()) {
      case 'ACTIVE': return 0;
      case 'SUSPENDED': return 1;
      default: return 2;
    }
  }

  private showBanner(message: string, tone: 'error' | 'info'): void {
    this.bannerMessage = message;
    this.bannerTone = tone;
  }
}
