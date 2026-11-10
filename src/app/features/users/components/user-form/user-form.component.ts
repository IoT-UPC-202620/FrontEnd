import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { User } from '../../model/user.model';
import { UpdateUserResource } from '../../model/update-user-resource.model';
import { UsersService } from '../../services/users.service';

import { RegisterService } from '../../../auth/services/register-service';
import { SignUpResource } from '../../../auth/models/sign-up-resource.model';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.css']
})
export class UserFormComponent implements OnInit {

  @Input() user: User | null = null;
  @Input() isCreateMode = false;

  @Output() close = new EventEmitter<boolean>();

  userForm!: FormGroup;

  isSubmitting = false;
  errorMessage = '';
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private usersService: UsersService,
    private registerService: RegisterService
  ) {}

  ngOnInit(): void {
    const currentUser = this.user as
      | (User & {
      documentType?: string;
      documentNumber?: string;
    })
      | null;

    this.userForm = this.fb.group({
      fullName: [
        currentUser?.fullName ?? '',
        [
          Validators.required,
          Validators.minLength(3)
        ]
      ],

      email: [
        currentUser?.email ?? '',
        [
          Validators.required,
          Validators.email
        ]
      ],

      phone: [
        currentUser?.phone ?? '',
        [
          Validators.required,
          Validators.pattern('^[0-9]{7,15}$')
        ]
      ],

      /*
       * Swagger solicita password también en el PUT.
       * En edición será la nueva contraseña del usuario.
       */
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(6)
        ]
      ],

      documentType: [
        currentUser?.documentType ?? 'DNI',
        Validators.required
      ],

      documentNumber: [
        currentUser?.documentNumber ?? '',
        [
          Validators.required,
          Validators.pattern('^[0-9A-Za-z-]{6,20}$')
        ]
      ]
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const value = this.userForm.getRawValue();

    if (this.isCreateMode) {
      this.createUser(value);
      return;
    }

    this.updateUser(value);
  }

  private createUser(value: any): void {
    const resource: SignUpResource = {
      fullName: value.fullName.trim(),
      email: value.email.trim(),
      password: value.password,
      phone: value.phone.trim(),
      documentType: value.documentType,
      documentNumber: value.documentNumber.trim(),

      // Todo usuario creado desde Units & Residents será OWNER.
      roles: ['OWNER']
    };

    this.registerService.signUp(resource).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.close.emit(true);
      },

      error: error => {
        console.error('Error creating user:', error);

        this.isSubmitting = false;

        this.errorMessage =
          typeof error?.error === 'string'
            ? error.error
            : error?.error?.message ??
              error?.error?.error ??
              'No se pudo crear el propietario.';
      }
    });
  }

  private updateUser(value: any): void {
    if (!this.user || this.user.id == null) {
      this.isSubmitting = false;
      this.errorMessage =
        'No se encontró el identificador del usuario.';
      return;
    }

    const resource: UpdateUserResource = {
      fullName: value.fullName.trim(),
      email: value.email.trim(),
      password: value.password,
      phone: value.phone.trim(),
      documentType: value.documentType,
      documentNumber: value.documentNumber.trim()
    };

    this.usersService.updateUser(
      this.user.id,
      resource
    ).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.close.emit(true);
      },

      error: error => {
        console.error('Error updating user:', error);

        this.isSubmitting = false;

        this.errorMessage =
          error?.error?.message ??
          error?.error?.error ??
          'No se pudo actualizar el usuario.';
      }
    });
  }

  onCancel(): void {
    if (this.isSubmitting) {
      return;
    }

    this.close.emit(false);
  }
}
