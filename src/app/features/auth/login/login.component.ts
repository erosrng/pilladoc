import { Component, signal, AfterViewInit, ViewChild, ElementRef, PLATFORM_ID, inject, effect } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import Swal from 'sweetalert2';
import { AuthService } from '../../../auth.service';

declare var google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements AfterViewInit {
  user = signal('');
  password = signal('');
  tipo = signal<string>('M');
  hidePassword = signal(true);
  errorMessage = signal('');
  isLoading = signal(false);
  googleLoading = signal(false);

  @ViewChild('googleBtn') googleBtnRef!: ElementRef<HTMLDivElement>;

  private platformId = inject(PLATFORM_ID);
  private googleInitialized = false;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {
    effect(() => {
      this.tipo();
      if (isPlatformBrowser(this.platformId) && this.googleInitialized) {
        setTimeout(() => this.renderGoogleButton(), 100);
      }
    });
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    if (typeof google !== 'undefined' && google.accounts) {
      this.initGoogle();
    } else {
      const check = setInterval(() => {
        if (typeof google !== 'undefined' && google.accounts) {
          clearInterval(check);
          this.initGoogle();
        }
      }, 200);
    }
    const observer = new MutationObserver(() => {
      if (this.googleInitialized) setTimeout(() => this.renderGoogleButton(), 50);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  private initGoogle() {
    google.accounts.id.initialize({
      client_id: '260209769815-1n48tdkh8igjjbcu6p4stamrndrp4fpa.apps.googleusercontent.com',
      callback: (response: any) => this.handleGoogleCredential(response),
    });
    this.googleInitialized = true;
    setTimeout(() => this.renderGoogleButton(), 100);
  }

  private renderGoogleButton() {
    if (!this.googleBtnRef?.nativeElement) return;
    this.googleBtnRef.nativeElement.innerHTML = '';
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    google.accounts.id.renderButton(this.googleBtnRef.nativeElement, {
      type: 'standard',
      shape: 'pill',
      theme: isDark ? 'filled_black' : 'outline',
      text: 'signin_with',
      size: 'large',
      width: this.googleBtnRef.nativeElement.clientWidth || 320,
      logo_alignment: 'left',
    });
  }

  private handleGoogleCredential(response: any) {
    if (!response?.credential) return;
    this.googleLoading.set(true);
    this.authService.loginWithGoogle(response.credential).subscribe({
      next: (res: any) => {
        this.googleLoading.set(false);
        if (res.status) {
          this.router.navigate(['/']);
        } else {
          this.errorMessage.set(res.message || 'Error al autenticar con Google');
        }
      },
      error: () => {
        this.googleLoading.set(false);
        this.errorMessage.set('Error de conexión con el servidor');
      },
    });
  }

  onLogin() {
    const user = this.user().trim();
    const pass = this.password();
    if (!user || !pass) {
      this.errorMessage.set('Ingresa tu usuario y contraseña');
      return;
    }
    this.errorMessage.set('');
    this.isLoading.set(true);
    this.authService.loginWithEmail(user, pass, this.tipo()).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res.status) {
          if (this.tipo() === 'M' || this.tipo() === 'P') {
            const tutorial = localStorage.getItem('tutorial_pendiente') === 'true';
            this.router.navigate([tutorial ? '/onboarding' : '/dashboardprv']);
          } else {
            this.router.navigate(['/']);
          }
        } else {
          this.errorMessage.set(res.message || 'Credenciales inválidas');
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Error de conexión con el servidor');
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo conectar con la API.', confirmButtonColor: '#0A6E6E' });
      },
    });
  }
}
