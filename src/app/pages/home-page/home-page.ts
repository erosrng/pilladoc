import { Component, OnInit, AfterViewInit, ElementRef, Renderer2, signal, inject, PLATFORM_ID } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { API_URL } from '../../app.config';
import { Carousel } from '../../components/carousel/carousel';

interface Doctor {
  proveed: string;
  nombre: string;
  email?: string;
  foto?: string;
  slug?: string;
  grupo?: string;
  gr_desc?: string;
  direc2?: string;
  direc3?: string;
  active?: boolean;
}

interface Estado {
  codigo: string;
  entidad: string;
}

interface Especialidad {
  grupo: string;
  gr_desc: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    Carousel,
  ],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage implements OnInit, AfterViewInit {
  featuredDoctors = signal<Doctor[]>([]);
  loadingDoctors = signal(false);
  estados = signal<Estado[]>([]);
  especialidades = signal<Especialidad[]>([]);

  estadoOpen = signal(false);
  especialidadOpen = signal(false);
  selectedEstado = signal<Estado | null>(null);
  selectedEspecialidad = signal<Especialidad | null>(null);
  searchQuery = signal('');

  private platformId = inject(PLATFORM_ID);

  benefits = [
    { icon: 'schedule', title: 'Ahorra tiempo', desc: 'Reserva online 24/7, sin llamadas ni esperas.' },
    { icon: 'verified', title: 'Doctores verificados', desc: 'Todos los profesionales pasan validación.' },
    { icon: 'calendar_month', title: 'Reserva express', desc: 'Agenda tu cita en menos de 30 segundos.' },
    { icon: 'savings', title: 'Sin costo extra', desc: 'Para pacientes es completamente gratuito.' },
  ];

  steps = [
    { icon: 'search', title: 'Busca', desc: 'Encuentra al especialista perfecto por ubicación, especialidad o nombre.' },
    { icon: 'calendar_month', title: 'Agenda', desc: 'Elige el día y hora que mejor te quede. Sin llamadas ni esperas.' },
    { icon: 'check_circle', title: 'Asiste', desc: 'Recibe recordatorios y gestiona tus citas desde cualquier dispositivo.' },
  ];

  constructor(
    private title: Title,
    private meta: Meta,
    private el: ElementRef,
    private renderer: Renderer2,
    private http: HttpClient,
    private router: Router,
  ) {}

  ngOnInit() {
    this.title.setTitle('PillaDoc | Atrapa tu salud — Encuentra especialistas en Venezuela');
    this.meta.updateTag({ name: 'description', content: 'Pilla a tu especialista en segundos. Busca doctores, reserva citas y gestiona tu salud desde un solo lugar. La plataforma #1 de Venezuela.' });
    this.meta.updateTag({ name: 'keywords', content: 'citas online, médicos venezuela, agenda médica, salud digital, telemedicina, pilladoc' });
    this.meta.updateTag({ property: 'og:title', content: 'PillaDoc | Atrapa tu salud' });
    this.meta.updateTag({ property: 'og:description', content: 'Pilla a tu especialista en segundos. Busca doctores, reserva citas y gestiona tu salud.' });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.loadFeaturedDoctors();
    this.loadEstados();
    this.loadEspecialidades();
  }

  loadFeaturedDoctors() {
    this.loadingDoctors.set(true);
    this.http.post(`${API_URL}listar_publico`, { page: 1, limit: 8 }).subscribe({
      next: (res: any) => {
        this.loadingDoctors.set(false);
        if (res.status) this.featuredDoctors.set(res.data || []);
      },
      error: () => this.loadingDoctors.set(false),
    });
  }

  loadEstados() {
    this.http.post(`${API_URL}estados`, {}).subscribe({
      next: (res: any) => {
        if (res.status) this.estados.set(res.data || []);
      },
    });
  }

  loadEspecialidades() {
    this.http.post(`${API_URL}buscagrupoprv`, {}).subscribe({
      next: (res: any) => {
        if (res.status) this.especialidades.set(res.data || []);
      },
    });
  }

  toggleEstado() {
    this.estadoOpen.update(v => !v);
    this.especialidadOpen.set(false);
  }

  toggleEspecialidad() {
    this.especialidadOpen.update(v => !v);
    this.estadoOpen.set(false);
  }

  selectEstado(e: Estado) {
    this.selectedEstado.set(e);
    this.estadoOpen.set(false);
  }

  selectEspecialidad(e: Especialidad) {
    this.selectedEspecialidad.set(e);
    this.especialidadOpen.set(false);
  }

  clearEstado() {
    this.selectedEstado.set(null);
  }

  clearEspecialidad() {
    this.selectedEspecialidad.set(null);
  }

  doSearch() {
    const params: any = {};
    const q = this.searchQuery();
    if (q) params.search = q;
    if (this.selectedEstado()) params.estado = this.selectedEstado()?.codigo;
    if (this.selectedEspecialidad()) params.especialidad = this.selectedEspecialidad()?.grupo;
    this.router.navigate(['/doctores'], { queryParams: params });
  }

  getInitials(name: string): string {
    return name?.split(' ').map((s: string) => s[0]).join('').slice(0, 2).toUpperCase() || 'DR';
  }

  getGradient(name: string): string {
    const gradients = [
      'linear-gradient(135deg, #0A6E6E, #119999)',
      'linear-gradient(135deg, #119999, #14b8b8)',
      'linear-gradient(135deg, #0f172a, #1e293b)',
      'linear-gradient(135deg, #14b8b8, #0A6E6E)',
      'linear-gradient(135deg, #1e293b, #0f172a)',
      'linear-gradient(135deg, #0A6E6E, #14b8b8)',
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      const elements = this.el.nativeElement.querySelectorAll('[data-reveal]');

      // Mark all elements visible immediately (no flash)
      elements.forEach((el: HTMLElement) => this.renderer.addClass(el, 'visible'));

      // Scroll-triggered reveal for dynamic content
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.renderer.addClass(entry.target, 'visible');
          }
        });
      }, { threshold: 0.1 });

      // Only observe elements not yet visible
      elements.forEach((el: HTMLElement) => {
        const rect = el.getBoundingClientRect();
        if (rect.top > window.innerHeight) {
          this.renderer.removeClass(el, 'visible');
          observer.observe(el);
        }
      });

      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.ap-search__select')) {
          this.estadoOpen.set(false);
          this.especialidadOpen.set(false);
        }
      });
    }
  }
}
