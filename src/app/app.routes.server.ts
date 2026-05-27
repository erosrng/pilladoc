import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'home', renderMode: RenderMode.Prerender },
  { path: 'doctores', renderMode: RenderMode.Prerender },
  { path: 'auth/login', renderMode: RenderMode.Prerender },
  { path: 'auth/register', renderMode: RenderMode.Prerender },
  { path: 'authprv', renderMode: RenderMode.Prerender },
  { path: 'dashboardprv', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Server },
];
