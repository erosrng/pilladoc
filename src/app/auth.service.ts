import { Injectable, PLATFORM_ID, Inject, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { API_URL } from './app.config';

interface DecodedToken {
  usuario: string;
  nombre: string;
  logged_in: boolean;
  tipo_u: string;
  almacen: string;
  tasa: string;
  proveed: string | null;
  cmatriz: string;
  lgrup: { grupo: string; nom_grup: string }[];
  clientes: { cliente: string; nombre: string; rifci: string }[];
  API_TIME: number;
  exp?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private token: string | null = null;
  private decodedToken: DecodedToken | null = null;
  private jwtHelper = new JwtHelperService();
  private _codCli: string | null = null;
  private isHandlingSessionExpired = false;
  private isBrowser: boolean;

  session = signal<any>(null);
  authLoading = signal(false);
  isLoggedInSignal = computed(() => {
    const s = this.session();
    return s !== null && s.logged_in === true;
  });
  userType = computed(() => {
    const s = this.session();
    if (!s) return null;
    if ('tipo_u' in s && s.tipo_u) return s.tipo_u;
    if ('rol' in s && s.rol === 'MEDICO') return 'M';
    return null;
  });
  userName = computed(() => this.session()?.nombre ?? null);
  userEmail = computed(() => this.session()?.email ?? null);
  userFoto = computed(() => this.session()?.foto ?? null);

  constructor(
    private router: Router,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.validateAndLoadToken();
  }

  private validateAndLoadToken(): void {
    if (!this.isBrowser) return;
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      this.token = null;
      this.decodedToken = null;
      this.session.set(null);
      return;
    }
    try {
      const decoded = this.jwtHelper.decodeToken(storedToken);
      if (!decoded || this.jwtHelper.isTokenExpired(storedToken)) {
        throw new Error('Token inválido o expirado');
      }
      this.token = storedToken;
      this.decodedToken = decoded;
      this.session.set(this.mapDecodedToSession(decoded));
    } catch (error) {
      this.token = null;
      this.decodedToken = null;
      this.session.set(null);
      if (!this.router.url.includes('/login') && !this.router.url.includes('/authprv')) {
        this.handleSessionExpired(storedToken);
      } else {
        this.removeToken();
      }
    }
  }

  setToken(token: string) {
    if (this.isBrowser) {
      localStorage.setItem('token', token);
      this.validateAndLoadToken();
    }
  }

  getToken(): string | null {
    if (this.token && this.decodedToken && !this.jwtHelper.isTokenExpired(this.token)) {
      return this.token;
    }
    this.validateAndLoadToken();
    return this.token;
  }

  removeToken() {
    this.token = null;
    this.decodedToken = null;
    this.session.set(null);
    if (this.isBrowser) {
      localStorage.removeItem('token');
    }
  }

  getUsuario(): string | null {
    this.getToken();
    return this.decodedToken ? this.decodedToken.usuario : null;
  }

  getNombre(): string | null {
    this.getToken();
    return this.decodedToken ? this.decodedToken.nombre : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.decodedToken && this.decodedToken.logged_in;
  }

  getTipoU(): string | null {
    this.getToken();
    return this.decodedToken ? this.decodedToken.tipo_u : null;
  }

  getProveed(): string | null {
    return this.decodedToken ? this.decodedToken.proveed : null;
  }

  getAlmacen(): string | null {
    this.getToken();
    return this.decodedToken ? this.decodedToken.almacen : null;
  }

  getTasa(): number {
    this.getToken();
    if (!this.decodedToken || this.decodedToken.tasa === undefined || this.decodedToken.tasa === null) return 0;
    const parsedTasa = parseFloat(this.decodedToken.tasa);
    return isNaN(parsedTasa) ? 0 : parsedTasa;
  }

  getCmatriz(): string | null {
    this.getToken();
    return this.decodedToken ? this.decodedToken.cmatriz : null;
  }

  getApiTime(): number | null {
    this.getToken();
    return this.decodedToken ? this.decodedToken.API_TIME : null;
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.clear();
      this.removeToken();
      this.isHandlingSessionExpired = false;
      this.router.navigate(['/']);
    }
  }

  async handleSessionExpired(invalidToken: string | null = null): Promise<void> {
    if (!this.isBrowser || this.isHandlingSessionExpired) return;
    this.isHandlingSessionExpired = true;
    let alertText = 'Tu sesión ha caducado. Serás redirigido al inicio de sesión.';
    await Swal.fire({
      icon: 'warning',
      title: 'Sesión Expirada',
      text: alertText,
      timer: 2000,
      timerProgressBar: true,
      showConfirmButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false
    });
    this.logout();
  }

  getCodCli(): string | null {
    if (!this.isBrowser) return null;
    this._codCli = localStorage.getItem('codCli');
    if (!this._codCli) {
      if (this.isLoggedIn()) {
        this._codCli = this.getUsuario();
        localStorage.setItem('codCli', this._codCli || '');
      } else {
        this._codCli = null;
      }
    }
    return this._codCli;
  }

  setCodCli(codCli: string | null): void {
    this._codCli = codCli;
    if (this.isBrowser) localStorage.setItem('codCli', codCli || '');
  }

  loginWithEmail(user: string, password: string, tipo: string): Observable<any> {
    const endpoint = tipo === 'M' || tipo === 'P' ? 'loginprv' : 'login_cliente';
    const formData = new FormData();
    formData.append('user', user);
    formData.append('password', password);
    return this.http.post(`${API_URL}${endpoint}`, formData).pipe(
      map((res: any) => {
        if (res.status && res.api_key) {
          this.setToken(res.api_key);
        }
        return res;
      }),
      catchError((err) => {
        return of({ status: false, message: 'Error de conexión con el servidor' });
      })
    );
  }

  loginWithGoogle(credential: string): Observable<any> {
    return this.http.post(`${API_URL}login_google_medico`, { google_token: credential });
  }

  private mapDecodedToSession(decoded: any): any {
    return {
      usuario: decoded.usuario,
      nombre: decoded.nombre,
      logged_in: decoded.logged_in,
      tipo_u: decoded.tipo_u,
      proveed: decoded.proveed,
      email: decoded.email || null,
      foto: decoded.foto || null,
      almacen: decoded.almacen,
      tasa: decoded.tasa,
      cmatriz: decoded.cmatriz,
      API_TIME: decoded.API_TIME,
    };
  }
}
