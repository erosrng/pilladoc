import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, NavigationEnd, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar implements OnInit, OnDestroy {
  isDarkMode = false;
  mobileOpen = signal(false);
  scrolled = signal(false);
  hideNavbar = signal(false);

  private isBrowser: boolean;
  private scrollFn: any;

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    public authService: AuthService,
    private router: Router,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') this.setDark();

      this.scrollFn = () => this.scrolled.set(window.scrollY > 20);
      window.addEventListener('scroll', this.scrollFn, { passive: true });

      this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe({
        next: (e: any) => this.hideNavbar.set(e.url.startsWith('/dashboardprv')),
      });
      this.hideNavbar.set(this.router.url.startsWith('/dashboardprv'));
    }
  }

  ngOnDestroy() {
    if (this.scrollFn) window.removeEventListener('scroll', this.scrollFn);
  }

  toggleTheme() {
    this.isDarkMode ? this.setLight() : this.setDark();
  }

  private setDark() {
    this.isDarkMode = true;
    if (this.isBrowser) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    }
  }

  private setLight() {
    this.isDarkMode = false;
    if (this.isBrowser) {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  }

  toggleMobile() {
    this.mobileOpen.update(v => !v);
  }

  closeMobile() {
    this.mobileOpen.set(false);
  }

  logout() {
    this.authService.logout();
    this.closeMobile();
  }
}
