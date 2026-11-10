import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Register } from './register';
import { provideHttpClient } from '@angular/common/http';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideHttpClient()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should require acceptance of the building terms before registration', () => {
    const acceptTermsControl = component.registerForm.get('acceptTerms');

    expect(acceptTermsControl).toBeTruthy();
    expect(acceptTermsControl?.hasError('required')).toBeTrue();
  });
});
