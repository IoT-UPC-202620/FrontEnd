import { Routes } from '@angular/router';

import { Login } from './features/auth/pages/login/login';
import { Register } from './features/auth/pages/register/register';
import { Layout } from './core/layout/layout';
import { authGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', component: Login },
  { path: 'register', component: Register },

  {
    path: 'app',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard/dashboard')
            .then(m => m.Dashboard)
      },
      {
        path: 'units',
        loadComponent: () =>
          import('./core/units/units')
            .then(m => m.Units)
      },
      {
        path: 'common-areas',
        loadComponent: () =>
          import('./core/common-areas/common-areas')
            .then(m => m.CommonAreas)
      },
      {
        path: 'finance',
        loadComponent: () =>
          import('./core/finance/finance')
            .then(m => m.Finance)
      },
      {
        path: 'community-wall',
        loadComponent: () =>
          import('./core/community-wall/community-wall')
            .then(m => m.CommunityWall)
      },
      {
        path: 'documentation',
        loadComponent: () =>
          import('./features/documentation/pages/documentation-center/documentation-center')
            .then(m => m.DocumentationCenter)
      },
      {
        path: 'smart-iot',
        loadComponent: () =>
          import('./features/smart-iot/pages/telemetry-dashboard-prototype/telemetry-prototype-page')
            .then(m => m.TelemetryPrototypePage)
      },
      {
        path: 'smart-iot/access-control',
        loadComponent: () =>
          import('./features/smart-iot/pages/iot-access-control/iot-access-control')
            .then(m => m.IotAccessControl)
      },
      {
        path: 'smart-iot/cards',
        loadComponent: () =>
          import('./features/smart-iot/pages/access-cards/access-cards')
            .then(m => m.TarjetaAccessCards)
      },
      {
        path: 'smart-iot/lighting',
        loadComponent: () =>
          import('./features/smart-iot/pages/iot-lighting/iot-lighting')
            .then(m => m.IotLighting)
      },
      {
        path: 'smart-iot/irrigation',
        loadComponent: () =>
          import('./features/smart-iot/pages/iot-irrigation/iot-irrigation')
            .then(m => m.IotIrrigation)
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./core/settings/settings')
            .then(m => m.Settings)
      }
    ]
  },

  { path: '**', redirectTo: 'app/dashboard' }
];
