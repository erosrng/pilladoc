import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export const redirectIfLoggedIn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) {
    const tipo = auth.getTipoU();
    if (tipo === 'P' || tipo === 'M') {
      router.navigate(['/dashboardprv']);
    } else {
      router.navigate(['/']);
    }
    return false;
  }
  return true;
};

export const authGuard = (route: any) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) {
    const allowed: string[] = route.data?.allowedTipos ?? [];
    if (allowed.length === 0) return true;
    const tipo = auth.getTipoU();
    if (tipo && allowed.includes(tipo)) return true;
    if (tipo === 'P' || tipo === 'M') {
      router.navigate(['/dashboardprv']);
    } else {
      router.navigate(['/']);
    }
    return false;
  }
  router.navigate(['/auth/login'], { queryParams: { returnUrl: route.url.join('/') } });
  return false;
};

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home-page/home-page').then(m => m.HomePage) },
  { path: 'home', loadComponent: () => import('./pages/home-page/home-page').then(m => m.HomePage) },
  { path: 'servicios', redirectTo: '/doctores', pathMatch: 'full' },
  { path: 'doctores', loadComponent: () => import('./pages/doctors-page/doctors-page').then(m => m.DoctorsPage) },
  {
    path: 'auth',
    canActivate: [redirectIfLoggedIn],
    children: [
      { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },
  {
    path: 'onboarding',
    canActivate: [authGuard],
    loadComponent: () => import('./features/auth/onboarding/onboarding.component').then(m => m.OnboardingComponent)
  },
  {
    path: 'dashboardprv',
    canActivate: [authGuard],
    data: { allowedTipos: ['P', 'M'] },
    loadComponent: () => import('./pages/dashboardprv/dashboardprv').then(m => m.DashboardprvPage)
  },
  { path: 'authprv', loadComponent: () => import('./pages/authprv-page/authprv-page').then(m => m.AuthprvPage) },
  { path: 'doctor/:slug', loadComponent: () => import('./pages/doctor-profile-page/doctor-profile-page').then(m => m.DoctorProfilePage) },
  { path: ':slug', loadComponent: () => import('./pages/perfil-page/perfil-page').then(m => m.PerfilPage) },
];
