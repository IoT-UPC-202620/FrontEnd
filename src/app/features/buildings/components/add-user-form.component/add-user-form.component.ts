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
import { ZardSelectImports } from '@/shared/components/select';
import { ZardSonnerService } from '@/shared/components/sonner';

import { RegisterService } from '../../../auth/services/register-service';
import { SignUpResource } from '../../../auth/models/sign-up-resource.model';

@Component({
  selector: 'app-add-user-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ZardButtonComponent,
    ...ZardDialogImports,
    ...ZardFieldImports,
    ZardInputComponent,
    ...ZardSelectImports,
  ],
  templateUrl: './add-user-form.component.html',
})
export class AddUserFormComponent {
  @Output() readonly close = new EventEmitter<boolean>();

  private readonly fb = inject(FormBuilder);
  private readonly registerService = inject(RegisterService);
  private readonly sonner = inject(ZardSonnerService);

  protected readonly userForm = this.fb.nonNullable.group({
    fullName: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
      ],
    ],

    email: [
      '',
      [
        Validators.required,
        Validators.email,
      ],
    ],

    phone: [
      '',
      [
        Validators.required,
        Validators.pattern('^[0-9]{7,15}$'),
      ],
    ],

    documentType: [
      'DNI',
      Validators.required,
    ],

    documentNumber: [
      '',
      [
        Validators.required,
        Validators.pattern('^[0-9A-Za-z-]{6,20}$'),
      ],
    ],
  });

  protected readonly visible = signal(true);

  isSubmitting = false;
  errorMessage = '';

  private result = false;

  protected onSubmit(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const value = this.userForm.getRawValue();

    const resource: SignUpResource = {
      fullName: value.fullName.trim(),
      email: value.email.trim(),
      phone: value.phone.trim(),
      documentType: value.documentType,
      documentNumber: value.documentNumber.trim(),

      // Users created here are always OWNERs.
      roles: ['OWNER'],
    };

    this.registerService.signUp(resource).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.result = true;
        this.sonner.success('User created', {
          description: 'The new owner has been registered and will receive their credentials by email.',
        });
        this.visible.set(false);
      },

      error: error => {
        console.error('Error creating user:', error);

        this.isSubmitting = false;

        this.errorMessage =
          typeof error?.error === 'string'
            ? error.error
            : error?.error?.message ??
              error?.error?.error ??
              'Could not create the user. Check the data and permissions.';
      },
    });
  }

  protected onDialogClosed(): void {
    this.close.emit(this.result);
  }
}
