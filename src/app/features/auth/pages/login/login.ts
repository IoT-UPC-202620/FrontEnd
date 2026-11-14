import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoginService } from '../../services/login-service';
import { SignInResource } from '../../models/sign-in-resource.model';
import { ZardButtonComponent } from '@/shared/components/button/button.component';

const RESIDENT_ACCOUNT_MESSAGE = 'Esta cuenta es de residente. Usa la app móvil Edifika.';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ZardButtonComponent],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private router = inject(Router);
  private formBuilder = inject(FormBuilder);
  private loginService = inject(LoginService);
  private route = inject(ActivatedRoute);

  isLoading = false;
  // adminGuard redirige con ?reason=resident si habia un token de residente guardado
  errorMessage = this.route.snapshot.queryParamMap.get('reason') === 'resident' ? RESIDENT_ACCOUNT_MESSAGE : '';
  showPassword = false;

  loginForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    remember: [false],
  });

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  login(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const resource: SignInResource = {
      email: this.loginForm.value.email?.trim() ?? '',
      password: this.loginForm.value.password ?? '',
    };

    this.loginService.signIn(resource).subscribe({
      next: () => {
        this.isLoading = false;
        if (!this.loginService.isAdmin()) {
          this.loginService.logout();
          this.errorMessage = RESIDENT_ACCOUNT_MESSAGE;
          return;
        }
        this.router.navigate(['/app/dashboard']);
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Email o contraseña incorrectos.';
      },
    });
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}
