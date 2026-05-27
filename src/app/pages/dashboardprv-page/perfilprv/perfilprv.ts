import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../auth.service';
import { API_URL } from '../../../app.config';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-perfilprv',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatCardModule, MatDividerModule
  ],
  templateUrl: './perfilprv.html',
  styleUrl: './perfilprv.scss',
})
export class Perfilprv implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  usuario: any = {
    nombre: '',
    rif: '',
    correo: '',
    telefono: '',
    direccion: '',
    especialidad: '',
    bio: '',
    fotoPerfil: null
  };

  imagePreview: string | ArrayBuffer | null = null;
  loading = false;

  ngOnInit() {
    this.obtenerPerfil();
  }

  obtenerPerfil() {
    const headers = new HttpHeaders({ 'X-Auth-Token': `${this.authService.getToken()}` });
    this.http.get(`${API_URL}pillaDoc/get_perfil`, { headers }).subscribe({
      next: (res: any) => {
        if (res.status) {
          this.usuario = res.data;
          this.imagePreview = res.data.fotoPerfil;
        }
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
        this.usuario.fotoPerfil = reader.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  guardarPerfil() {
    this.loading = true;
    const headers = new HttpHeaders({ 'X-Auth-Token': `${this.authService.getToken()}` });
    
    this.http.post(`${API_URL}pillaDoc/update_perfil`, this.usuario, { headers }).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.status) {
          Swal.fire({ title: '¡Actualizado!', text: 'Tu perfil ha sido guardado', icon: 'success', timer: 2000, showConfirmButton: false });
        }
      },
      error: () => this.loading = false
    });
  }
}