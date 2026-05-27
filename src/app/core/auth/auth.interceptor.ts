import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const ENDPOINTS_PUBLICOS = [
  'login', 'logincli', 'loginprv', 'login_google', 'login_google_medico',
  'login_cliente', 'login_cliente_google', 'municipios', 'buscagrupoprv',
  'buscacliente', 'buscaclienteregistrado', 'guardar_usuario', 'enviausuario',
  'enviaclave', 'estados', 'guardar_proveedor', 'guardar_cliente', 'inventario',
  'perfil_publico', 'listar_publico',
];

function esEndpointPublico(url: string): boolean {
  return ENDPOINTS_PUBLICOS.some(e => url.includes(e));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return next(req);
  if (esEndpointPublico(req.url)) return next(req);
  if (req.url.includes('oauth2.googleapis.com') || req.url.includes('googleapis')) return next(req);
  const token = localStorage.getItem('token');
  if (token) {
    const cloned = req.clone({
      setHeaders: { 'X-Auth-Token': token }
    });
    return next(cloned);
  }
  return next(req);
};
