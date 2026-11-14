import { Component } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CurrencyToggleComponent } from '@/shared/core/currency/currency-toggle.component';
import {LoginService} from '../../features/auth/services/login-service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CurrencyToggleComponent],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class Layout {
  constructor(
    private router: Router,
    private loginService: LoginService
  ) {}

  navItems = [
    { label: 'Dashboard', icon: 'dashboard', route: '/app/dashboard' },
    { label: 'Units & Residents', icon: 'apartment', route: '/app/units' },
    { label: 'Common Areas', icon: 'deck', route: '/app/common-areas' },
    { label: 'Finance', icon: 'account_balance_wallet', route: '/app/finance' },
    { label: 'Community Wall', icon: 'forum', route: '/app/community-wall' },
    { label: 'Documentación', icon: 'folder_open', route: '/app/documentation' },
    { label: 'SmartIOT', icon: 'sensors', route: '/app/smart-iot' },
  ];

  logout(): void {
    this.loginService.logout();
    this.router.navigate(['/login']);
  }
}
