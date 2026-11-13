import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ZardSonnerComponent } from '@/shared/components/sonner';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ZardSonnerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Edifika');
}
