import { Component, inject } from '@angular/core';

import { CurrencyDisplayService, DisplayCurrency } from './currency-display.service';

@Component({
  selector: 'app-currency-toggle',
  standalone: true,
  template: `
    <div class="toggle" role="group" aria-label="Moneda">
      @for (option of options; track option.code) {
        <button
          type="button"
          [class.active]="currencyService.currency() === option.code"
          [attr.aria-pressed]="currencyService.currency() === option.code"
          (click)="currencyService.setCurrency(option.code)">
          {{ option.label }}
        </button>
      }
    </div>
  `,
  styles: [`
    .toggle { display: inline-flex; border: 1px solid #e8e0e6; border-radius: 999px; padding: 2px; background: #fff; }
    button { border: 0; background: transparent; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; color: #847280; cursor: pointer; }
    button.active { background: #8A0B80; color: #fff; }
  `]
})
export class CurrencyToggleComponent {
  readonly currencyService = inject(CurrencyDisplayService);
  readonly options: { code: DisplayCurrency; label: string }[] = [
    { code: 'PEN', label: 'S/ PEN' },
    { code: 'USD', label: 'US$ USD' }
  ];
}
