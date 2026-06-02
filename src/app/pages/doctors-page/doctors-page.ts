import { Component, OnInit, signal, computed, AfterViewInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { API_URL } from '../../app.config';

interface Doctor {
  proveed: string;
  nombre: string;
  foto?: string;
  slug?: string;
  grupo?: string;
  especialidad?: string;
  direc2?: string;
  direc3?: string;
  active?: boolean;
  telefono?: string;
  valoracion?: number;
  resenas?: number;
}

interface Estado { codigo: string; entidad: string; }
interface Especialidad { grupo: string; gr_desc: string; }
interface Municipio { id: string; nombre: string; }

@Component({
  selector: 'app-doctors-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './doctors-page.html',
  styleUrl: './doctors-page.scss',
})
export class DoctorsPage implements OnInit, AfterViewInit {
  doctors = signal<Doctor[]>([]);
  specialties = signal<Especialidad[]>([]);
  estados = signal<Estado[]>([]);
  municipios = signal<Municipio[]>([]);

  search = signal('');
  selectedSpecialty = signal('');
  selectedEstado = signal('');
  selectedMunicipio = signal('');
  page = signal(1);
  totalPages = signal(1);
  isLoading = signal(false);

  estadoOpen = signal(false);
  especialidadOpen = signal(false);
  municipioOpen = signal(false);

  hasMorePages = computed(() => this.page() < this.totalPages());
  hasPrevPage = computed(() => this.page() > 1);
  doctorsCount = computed(() => this.doctors().length);

  activeFiltersCount = computed(() => {
    let c = 0;
    if (this.search()) c++;
    if (this.selectedSpecialty()) c++;
    if (this.selectedEstado()) c++;
    if (this.selectedMunicipio()) c++;
    return c;
  });

  get selectedEstadoName() {
    const e = this.estados().find(e => e.codigo === this.selectedEstado());
    return e ? e.entidad : '';
  }

  get selectedMunicipioName() {
    const m = this.municipios().find(m => m.id === this.selectedMunicipio());
    return m ? m.nombre : '';
  }

  get selectedSpecialtyName() {
    const s = this.specialties().find(s => s.grupo === this.selectedSpecialty());
    return s ? s.gr_desc : '';
  }

  private platformId = inject(PLATFORM_ID);
  private firstLoad = true;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadSpecialties();
    this.loadEstados();
    this.route.queryParams.subscribe(params => {
      if (params['search']) this.search.set(params['search']);
      if (params['estado']) {
        this.selectedEstado.set(params['estado']);
        setTimeout(() => this.onEstadoChange(), 100);
      }
      if (params['especialidad']) this.selectedSpecialty.set(params['especialidad']);
      if (this.firstLoad || params['search'] || params['estado'] || params['especialidad']) {
        this.searchDoctors();
        this.firstLoad = false;
      }
    });
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.ap-filter-select')) {
          this.estadoOpen.set(false);
          this.especialidadOpen.set(false);
          this.municipioOpen.set(false);
        }
      });
    }
  }

  toggleEstado() {
    this.estadoOpen.update(v => !v);
    this.especialidadOpen.set(false);
    this.municipioOpen.set(false);
  }

  toggleEspecialidad() {
    this.especialidadOpen.update(v => !v);
    this.estadoOpen.set(false);
    this.municipioOpen.set(false);
  }

  toggleMunicipio() {
    this.municipioOpen.update(v => !v);
    this.estadoOpen.set(false);
    this.especialidadOpen.set(false);
  }

  selectEstado(codigo: string) {
    this.selectedEstado.set(codigo);
    this.selectedMunicipio.set('');
    this.municipios.set([]);
    this.estadoOpen.set(false);
    this.onEstadoChange();
  }

  selectEspecialidad(grupo: string) {
    this.selectedSpecialty.set(grupo);
    this.especialidadOpen.set(false);
    this.searchDoctors();
  }

  selectMunicipio(codigo: string | undefined) {
    this.selectedMunicipio.set(codigo || '');
    this.municipioOpen.set(false);
    this.searchDoctors();
  }

  onEstadoChange() {
    if (!this.selectedEstado()) return;
    const fd = new FormData();
    fd.append('estado_id', this.selectedEstado());
    this.http.post(`${API_URL}municipios`, fd).subscribe({
      next: (res: any) => {
        if (res.status) this.municipios.set(res.data || []);
        if (!this.firstLoad) this.searchDoctors();
      },
    });
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

  searchDoctors() {
    this.isLoading.set(true);
    this.page.set(1);
    this.executeSearch();
  }

  private executeSearch() {
    const body: any = { page: this.page(), limit: 12 };
    const s = this.search().trim();
    if (s) body.search = s;
    if (this.selectedSpecialty()) body.especialidad = this.selectedSpecialty();
    if (this.selectedEstado()) body.estado = this.selectedEstado();
    if (this.selectedMunicipio()) body.municipio = this.selectedMunicipio();
    this.http.post(`${API_URL}listar_publico`, body).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res.status) {
          this.doctors.set(res.data || []);
          this.totalPages.set(res.totalPages || 1);
        }
      },
      error: () => this.isLoading.set(false),
    });
  }

  prevPage() {
    if (this.hasPrevPage()) {
      this.page.update(p => p - 1);
      this.isLoading.set(true);
      this.executeSearch();
    }
  }

  nextPage() {
    if (this.hasMorePages()) {
      this.page.update(p => p + 1);
      this.isLoading.set(true);
      this.executeSearch();
    }
  }

  goToPage(p: number) {
    this.page.set(p);
    this.isLoading.set(true);
    this.executeSearch();
  }

  clearFilters() {
    this.search.set('');
    this.selectedSpecialty.set('');
    this.selectedEstado.set('');
    this.selectedMunicipio.set('');
    this.municipios.set([]);
    this.searchDoctors();
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
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
}
