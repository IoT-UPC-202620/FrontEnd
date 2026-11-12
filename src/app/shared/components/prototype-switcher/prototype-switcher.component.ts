import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { environment } from '../../../../environments/environment';

/**
 * PROTOTYPE — barra flotante para alternar variantes. Se oculta en producción.
 */
@Component({
  selector: 'app-prototype-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (!isProduction) {
      <div class="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-stretch overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
           role="toolbar" aria-label="Prototype variant switcher">
        <button type="button" class="grid w-10 place-items-center hover:bg-muted" (click)="cycle(-1)" aria-label="Variante anterior">
          <span class="material-icons text-xl">chevron_left</span>
        </button>
        <div class="flex min-w-[160px] flex-col items-center justify-center border-x border-border px-3 py-1.5 leading-tight">
          <strong class="text-xs font-semibold">{{ currentLabel() }}</strong>
          <span class="text-[10px] text-muted-foreground">variant={{ currentKey }}</span>
        </div>
        <button type="button" class="grid w-10 place-items-center hover:bg-muted" (click)="cycle(1)" aria-label="Variante siguiente">
          <span class="material-icons text-xl">chevron_right</span>
        </button>
      </div>
    }
  `
})
export class PrototypeSwitcherComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isProduction = environment.production;
  readonly variants = [
    { key: 'A', label: 'A · Sala de control' },
    { key: 'B', label: 'B · Muro de monitoreo' },
    { key: 'C', label: 'C · Bitácora de eventos' }
  ];

  currentKey = 'A';

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const v = (params.get('variant') ?? 'A').toUpperCase();
      this.currentKey = this.variants.some(x => x.key === v) ? v : 'A';
    });
  }

  currentLabel(): string {
    return this.variants.find(v => v.key === this.currentKey)?.label ?? 'A';
  }

  cycle(direction: 1 | -1): void {
    const index = this.variants.findIndex(v => v.key === this.currentKey);
    const next = (index + direction + this.variants.length) % this.variants.length;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { variant: this.variants[next].key },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
    if (event.key === 'ArrowLeft') this.cycle(-1);
    else if (event.key === 'ArrowRight') this.cycle(1);
  }
}
