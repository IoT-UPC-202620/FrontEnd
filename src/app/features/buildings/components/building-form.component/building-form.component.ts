import {
  CommonModule,
} from '@angular/common';

import {
  Component,
  EventEmitter,
  Output,
  inject,
  signal
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { ZardButtonComponent } from '@/shared/components/button';
import { ZardDialogImports } from '@/shared/components/dialog/dialog.imports';
import { ZardFieldImports } from '@/shared/components/field';
import { ZardInputComponent } from '@/shared/components/input';

import { BuildingsService } from '../../services/buildings.service';
import { CreateBuildingResource } from '../../model/create-building-resource.model';

@Component({
  selector: 'app-building-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ZardButtonComponent,
    ...ZardDialogImports,
    ...ZardFieldImports,
    ZardInputComponent,
  ],
  templateUrl: './building-form.component.html',
})
export class BuildingFormComponent {
  @Output() readonly close = new EventEmitter<boolean>();

  private readonly fb = inject(FormBuilder);
  private readonly buildingsService = inject(BuildingsService);

  protected readonly buildingForm = this.fb.nonNullable.group({
    name: [
      '',
      [
        Validators.required,
        Validators.minLength(3)
      ]
    ],

    address: [
      '',
      [
        Validators.required,
        Validators.minLength(5)
      ]
    ],

    district: [
      '',
      [
        Validators.required,
        Validators.minLength(3)
      ]
    ],

    city: [
      'Lima',
      [
        Validators.required,
        Validators.minLength(3)
      ]
    ]
  });

  protected readonly visible = signal(true);

  isSubmitting = false;
  errorMessage = '';

  private result = false;

  protected onSubmit(): void {
    if (this.buildingForm.invalid) {
      this.buildingForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const value = this.buildingForm.getRawValue();

    const resource: CreateBuildingResource = {
      name: value.name.trim(),
      address: value.address.trim(),
      district: value.district.trim(),
      city: value.city.trim()
    };

    this.buildingsService.createBuilding(resource).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.result = true;
        this.visible.set(false);
      },

      error: error => {
        console.error('Error creating building:', error);

        this.isSubmitting = false;

        this.errorMessage =
          error?.error?.message ??
          error?.error?.error ??
          'Could not create the building. Check the data and permissions.';
      },
    });
  }

  protected onDialogClosed(): void {
    this.close.emit(this.result);
  }
}
