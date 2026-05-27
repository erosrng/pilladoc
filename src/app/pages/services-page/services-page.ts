import { Component, OnInit, AfterViewInit, ElementRef, Renderer2, signal, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PLATFORM_ID, inject } from '@angular/core';
import { API_URL } from '../../app.config';

@Component({
  selector: 'app-services-page',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule,
    MatIconModule, MatButtonModule, MatProgressSpinnerModule,
  ],
  templateUrl: './services-page.html',
  styleUrl: './services-page.scss',
})
export class ServicesPage implements OnInit, AfterViewInit {
  doctors = signal<any[]>([]);
  specialties = signal<any[]>([]);
  estados = signal<any[]>([]);
  municipios = signal<any[]>([]);

  search = signal('');
  selectedSpecialty = signal('');
  selectedEstado = signal('');
  selectedMunicipio = signal('');
  selectedCity = signal('');

  isLoading = signal(false);
  loadingMore = signal(false);

  start = 0;
  limit = 12;
  totalCount = 0;
  hasMore = signal(false);

  filteredCount = computed(() => this.doctors().length);
  activeFiltersCount = computed(() => {
    let c = 0;
    if (this.search()) c++;
    if (this.selectedSpecialty()) c++;
    if (this.selectedEstado()) c++;
    if (this.selectedMunicipio()) c++;
    return c;
  });

  private platformId = inject(PLATFORM_ID);

  constructor(
    private http: HttpClient,
    private el: ElementRef,
    private renderer: Renderer2,
  ) {}

  ngOnInit() {
    this.loadSpecialties();
    this.loadEstados();
    this.searchDoctors();
  }

  loadSpecialties() {
    this.http.post(`${API_URL}buscagrupoprv`, {}).subscribe({
      next: (res: any) => {
        if (res.status) this.specialties.set(res.data || []);
      },
    });
  }

  loadEstados() {
    this.http.post(`${API_URL}estados`, {}).subscribe({
      next: (res: any) => {
        if (res.status) this.estados.set(res.data || []);
      },
    });
  }

  onEstadoChange() {
    this.selectedMunicipio.set('');
    this.municipios.set([]);
    const estadoId = this.selectedEstado();
    if (!estadoId) return;
    this.http.post(`${API_URL}municipios`, { estado_id: estadoId }).subscribe({
      next: (res: any) => {
        if (res.status) this.municipios.set(res.data || []);
      },
    });
  }

  searchDoctors() {
    this.isLoading.set(true);
    this.start = 0;
    this.doctors.set([]);
    this.executeSearch();
  }

  loadMore() {
    if (this.loadingMore() || !this.hasMore()) return;
    this.loadingMore.set(true);
    this.executeSearch();
  }

  private executeSearch() {
    const body: any = { start: this.start, limit: this.limit };
    const s = this.search().trim();
    if (s) body.search = s;
    if (this.selectedSpecialty()) body.especialidad = this.selectedSpecialty();
    if (this.selectedEstado()) body.estado = this.selectedEstado();
    if (this.selectedMunicipio()) body.municipio = this.selectedMunicipio();
    this.http.post(`${API_URL}listar_publico`, body).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        this.loadingMore.set(false);
        if (res.status) {
          const data = res.data || [];
          this.doctors.update(prev => [...prev, ...data]);
          this.totalCount = res.totalCount || data.length;
          this.start += this.limit;
          this.hasMore.set(data.length >= this.limit);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.loadingMore.set(false);
      },
    });
  }

  clearFilters() {
    this.search.set('');
    this.selectedSpecialty.set('');
    this.selectedEstado.set('');
    this.selectedMunicipio.set('');
    this.municipios.set([]);
    this.searchDoctors();
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) this.renderer.addClass(entry.target, 'visible');
        });
      }, { threshold: 0.1 });
      this.el.nativeElement.querySelectorAll('[data-reveal]').forEach((el: HTMLElement) => observer.observe(el));
    }
  }
}
