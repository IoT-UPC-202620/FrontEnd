import { Pipe, PipeTransform, inject } from '@angular/core';

import { CurrencyDisplayService } from './currency-display.service';

/**
 * {{ monto | money }}          -> monto en PEN mostrado en la moneda elegida (S/ o US$)
 * {{ monto | money:'USD' }}    -> monto de origen en USD
 * Impuro: se re-evalua cuando cambia la moneda del toggle.
 */
@Pipe({ name: 'money', standalone: true, pure: false })
export class MoneyPipe implements PipeTransform {
  private readonly currencyService = inject(CurrencyDisplayService);

  transform(amount: number | string | null | undefined, from: string = 'PEN'): string {
    return this.currencyService.format(amount, from);
  }
}
