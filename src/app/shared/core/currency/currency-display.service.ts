import { Injectable, signal } from '@angular/core';

import { environment } from '../../../../environments/environment';

export type DisplayCurrency = 'PEN' | 'USD';

const STORAGE_KEY = 'edifika_currency';
const LOCALE = 'es-PE';

/**
 * Moneda de visualizacion (PEN por defecto, USD opcional).
 * La conversion es SOLO visual: los montos que se envian al backend y a Culqi no cambian.
 * El backend (Payment) guarda los montos en soles (currency = "PEN").
 */
@Injectable({ providedIn: 'root' })
export class CurrencyDisplayService {
  private readonly rate = environment.exchangeRateUsdToPen;
  readonly currency = signal<DisplayCurrency>(this.readStored());

  setCurrency(currency: DisplayCurrency): void {
    this.currency.set(currency);
    try {
      localStorage.setItem(STORAGE_KEY, currency);
    } catch {
      // sin localStorage: solo dura la sesion
    }
  }

  toggle(): void {
    this.setCurrency(this.currency() === 'PEN' ? 'USD' : 'PEN');
  }

  /** Convierte un monto desde su moneda de origen (por defecto PEN) a la moneda elegida. */
  convert(amount: number, from: string = 'PEN'): number {
    const source = (from || 'PEN').toUpperCase();
    const target = this.currency();
    if (source === target) return amount;
    if (source === 'PEN' && target === 'USD') return amount / this.rate;
    if (source === 'USD' && target === 'PEN') return amount * this.rate;
    return amount;
  }

  /** "S/ 1,250.00" o "US$ 333.33" segun la moneda elegida. */
  format(amount: number | string | null | undefined, from: string = 'PEN'): string {
    const value = Number(amount ?? 0);
    if (!Number.isFinite(value)) return '';
    return formatMoney(this.convert(value, from), this.currency());
  }

  private readStored(): DisplayCurrency {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'USD' ? 'USD' : 'PEN';
    } catch {
      return 'PEN';
    }
  }
}

/** Formato fijo en una moneda, sin conversion (ej. textos que se envian al backend). */
export function formatMoney(amount: number, currency: string = 'PEN'): string {
  const text = new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
  // es-PE muestra "USD 1,234.50"; "US$" evita confundirlo con S/
  return currency === 'USD' ? text.replace('USD', 'US$') : text;
}
