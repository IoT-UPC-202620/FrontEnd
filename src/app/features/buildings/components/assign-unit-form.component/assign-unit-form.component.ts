import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, filter, map, of, switchMap, tap } from 'rxjs';

import { ZardButtonComponent } from '@/shared/components/button';
import { ZardDialogImports } from '@/shared/components/dialog/dialog.imports';
import { ZardFieldImports } from '@/shared/components/field';
import { ZardInputComponent } from '@/shared/components/input';
import { ZardSelectImports } from '@/shared/components/select';
import { ZardSonnerService } from '@/shared/components/sonner';

import { Building } from '../../model/building.model';
import { Unit } from '../../model/unit.model';
import { BuildingsService } from '../../services/buildings.service';
import { UnitsService } from '../../services/units.service';
import {
  RESIDENT_ROLE_LABELS,
  ResidentManagementService,
  ResidentSearchResult
} from '../../services/resident-management.service';

const MIN_CHARS = 3;
const DEBOUNCE_MS = 300;

/**
 * "Assign to Unit": busca un residente existente (OWNER/TENANT) por DNI o nombre,
 * elige torre y unidad, y lo vincula (POST /residential/residents/assignments).
 */
@Component({
  selector: 'app-assign-unit-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ZardButtonComponent,
    ...ZardDialogImports,
    ...ZardFieldImports,
    ZardInputComponent,
    ...ZardSelectImports
  ],
  templateUrl: './assign-unit-form.component.html'
})
export class AssignUnitFormComponent implements OnInit {
  /** true = se asigno (refrescar la tabla). */
  @Output() readonly close = new EventEmitter<boolean>();
  /** El usuario no existe: abrir "Add Resident / Tenant". */
  @Output() readonly createRequested = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly residents = inject(ResidentManagementService);
  private readonly buildingsService = inject(BuildingsService);
  private readonly unitsService = inject(UnitsService);
  private readonly sonner = inject(ZardSonnerService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly visible = signal(true);
  protected readonly roleLabels = RESIDENT_ROLE_LABELS;
  protected readonly minChars = MIN_CHARS;

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly placementForm = this.fb.nonNullable.group({
    buildingId: ['', Validators.required],
    unitId: ['', Validators.required]
  });

  results: ResidentSearchResult[] = [];
  searched = false;
  isSearching = false;
  selected: ResidentSearchResult | null = null;

  buildings: Building[] = [];
  units: Unit[] = [];
  isLoadingUnits = false;

  isSubmitting = false;
  errorMessage = '';
  private result = false;

  ngOnInit(): void {
    this.buildingsService.getAll().subscribe({
      next: buildings => (this.buildings = buildings),
      error: () => (this.errorMessage = 'Could not load the towers.')
    });

    this.searchControl.valueChanges
      .pipe(
        map(term => term.trim()),
        tap(term => {
          if (term.length < MIN_CHARS) {
            this.results = [];
            this.searched = false;
          }
        }),
        debounceTime(DEBOUNCE_MS),
        distinctUntilChanged(),
        filter(term => term.length >= MIN_CHARS),
        tap(() => (this.isSearching = true)),
        switchMap(term =>
          this.residents.search(term).pipe(
            catchError(() => {
              this.errorMessage = 'Search failed. Try again.';
              return of([] as ResidentSearchResult[]);
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(results => {
        this.results = results;
        this.searched = true;
        this.isSearching = false;
      });

    this.placementForm.controls.buildingId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(buildingId => {
        this.placementForm.controls.unitId.setValue('');
        this.units = [];
        if (!buildingId) return;
        this.isLoadingUnits = true;
        this.unitsService.getByBuildingId(Number(buildingId)).subscribe({
          next: units => {
            this.units = [...units].sort((a, b) => a.unitNumber - b.unitNumber);
            this.isLoadingUnits = false;
          },
          error: () => {
            this.isLoadingUnits = false;
            this.errorMessage = 'Could not load the units of this tower.';
          }
        });
      });
  }

  protected select(person: ResidentSearchResult): void {
    this.selected = person;
    this.errorMessage = '';
  }

  protected changePerson(): void {
    this.selected = null;
  }

  protected requestCreate(): void {
    this.createRequested.emit();
    this.visible.set(false);
  }

  protected onSubmit(): void {
    if (!this.selected || this.placementForm.invalid) {
      this.placementForm.markAllAsTouched();
      return;
    }
    const { buildingId, unitId } = this.placementForm.getRawValue();
    this.isSubmitting = true;
    this.errorMessage = '';

    this.residents.assignToUnit(this.selected.id, Number(buildingId), Number(unitId)).subscribe({
      next: () => {
        const unit = this.units.find(u => String(u.idUnit) === unitId);
        this.isSubmitting = false;
        this.result = true;
        this.sonner.success('Resident assigned', {
          description: `${this.selected?.fullName} → unit ${unit?.unitNumber ?? unitId}`
        });
        this.visible.set(false);
      },
      error: error => {
        this.isSubmitting = false;
        this.errorMessage =
          error?.error?.message ??
          (typeof error?.error === 'string' ? error.error : null) ??
          'Could not assign the resident.';
      }
    });
  }

  protected onDialogClosed(): void {
    this.close.emit(this.result);
  }
}
