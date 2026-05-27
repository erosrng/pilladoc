import { Component, OnInit, inject, ViewChild, TemplateRef, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Material Imports
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import Swal from 'sweetalert2';

import { AuthService } from '.././../../auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { API_URL } from '../../../app.config';


export interface Articulo {
  descripcion: string;
  tipo: 'PRODUCTO' | 'SERVICIO';
  modalidad?: 'PROYECTO' | 'HORA' | 'CITA' | 'ABONO' | 'ALQUILER';
  precio: number;
  estado: 'Activo' | 'Inactivo' | 'Agotado';
  imagen?: string;
  barras?: string;
  // Campos de Producto
  stock?: number;
  minimo?: number;
  // Campos de Servicio (Flexibles)
  diasServicio?: string; // Ej: "Lunes a Sábado"
  horaInicio?: string;   // Ej: "08:00"
  horaFin?: string;      // Ej: "17:00"
  notaServicio?: string; // Ej: "Incluye instalación" o "Alquiler por 24h"
}
@Component({
  selector: 'app-itemsprv',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatTableModule, MatPaginatorModule,
    MatSortModule, MatButtonModule, MatIconModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule,
    MatToolbarModule, MatCardModule, MatMenuModule, MatDividerModule,
    MatTooltipModule
  ],
  templateUrl: './itemsprv.html',
  styleUrl: './itemsprv.scss' // Asegúrate de tener este archivo
})
export class Itemsprv implements OnInit {
  private dialog = inject(MatDialog);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);
  private http= inject(HttpClient);
  public authService = inject(AuthService);

  displayedColumns: string[] = ['imagen', 'datos', 'tipo', 'precio', 'stock', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<Articulo>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('modalArticulo', { static: false }) modalArticulo!: TemplateRef<any>;

  itemActual: any = {};
  isEdit = false;
  imagePreview: string | ArrayBuffer | null = null;

  isLoading = false;
  dialogRef: any;

  ngOnInit() {
    this.cargarData();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  aplicarFiltro(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  cargarData() {
    this.isLoading = true;
    const token = this.authService.getToken();
    const headers = new HttpHeaders({ 'X-Auth-Token': `${token}` });
    const apiUrl = `${API_URL}pillaDoc/get_items_sinv`;
    const formData = new FormData();
    const prvreg = this.authService.getProveed(); // Asumiendo que usas authService

    formData.append('prvreg', prvreg  ?? '');

    this.http.post(apiUrl,formData, { headers }).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.status) {
          // Reemplazamos los datos de la tabla con los de la base de datos
          this.dataSource.data = response.data;
          this.cdr.detectChanges(); // Forzamos el refresco visual
        } else {
          console.error('Error al traer items:', response.mensaje);
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error de conexión:', err);
      }
    });
  }

  abrirModal(item?: Articulo) {
    this.isEdit = !!item;
    this.imagePreview = item?.imagen || null;
    this.itemActual = item ? { ...item } : { tipo: 'PRODUCTO', precio: 0, stock: 0, estado: 'Activo' };
    
    // Forzamos a que espere al siguiente tick del event loop
    setTimeout(() => {
      if (this.modalArticulo) {
        this.dialogRef = this.dialog.open(this.modalArticulo, { 
            width: '1400px',    
            maxWidth: '95vw',  
            maxHeight: '90vh',
            panelClass: 'custom-erp-modal', 
            disableClose: true,
            autoFocus: false
        });

        this.dialogRef.afterClosed().subscribe((result: any) => {
          if (result==true) {
            this.cargarData();
          }
        });
      } else {
        console.error("No se encontró el TemplateRef 'modalArticulo'");
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
        this.itemActual.imagen = reader.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  guardarProducto() {
    // 1. Verificación de campos obligatorios generales
  if (!this.itemActual.descripcion || !this.itemActual.tipo || this.itemActual.precio<=0) {
    Swal.fire({
      title: 'Faltan datos',
      text: 'Por favor complete el nombre, tipo y precio del ítem.',
      icon: 'warning',
      confirmButtonColor: '#1e293b'
    });
    return;
  }

  // 2. Validación específica por Tipo
  if (this.itemActual.tipo === 'PRODUCTO') {
    if (this.itemActual.stock === null || this.itemActual.stock === undefined || this.itemActual.stock < 0) {
      Swal.fire({ 
        text: 'El stock es obligatorio y no puede ser negativo para productos.', 
        icon: 'warning' 
      });
      return;
    }
  } else if (this.itemActual.tipo === 'SERVICIO') {
    if (!this.itemActual.modalidad) {
      Swal.fire({ 
        text: 'Debe seleccionar una modalidad de cobro para el servicio.', 
        icon: 'warning' 
      });
      return;
    }
  }

    // 2. Preparación de la Data y Seguridad
    const formData = new FormData();
    const token = this.authService.getToken(); 
    const prvreg = this.authService.getProveed(); // Asumiendo que usas authService
    const apiUrl = `${API_URL}pillaDoc/gestion_item`; // La ruta que definas en tu controlador

    // Si estamos editando, mandamos el ID para el WHERE del UPDATE
    if (this.isEdit && this.itemActual.id) {
      formData.append('id', this.itemActual.id.toString());
    }

    // Mapeo exacto de los campos que espera el PHP
    formData.append('descripcion', this.itemActual.descripcion || '');
    formData.append('descripcionLarga', this.itemActual.descripcionLarga || '');
    formData.append('tipo', this.itemActual.tipo || 'PRODUCTO');
    formData.append('precio', this.itemActual.precio?.toString() || '0');
    formData.append('stock', this.itemActual.stock?.toString() || '0');
    formData.append('minimo', this.itemActual.minimo?.toString() || '0');
    formData.append('estado', this.itemActual.estado || 'Inactivo');
    formData.append('modalidad', this.itemActual.modalidad || 'UNIDAD');
    formData.append('tiempoEntrega', this.itemActual.tiempoEntrega || 'A convenir');
    formData.append('prvreg', prvreg  ?? '');

    // Headers con el Token de autenticación
    const headers = new HttpHeaders({
      'X-Auth-Token': `${token}`
    });

    // 3. Confirmación y Envío
    Swal.fire({
      title: this.isEdit ? '¿Actualizar registro?' : '¿Publicar nuevo item?',
      text: "Los cambios se verán reflejados en el catálogo maestro.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#1e293b' // Color Navy corporativo
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.showLoading();
        this.isLoading = true;

        this.http.post(apiUrl, formData, { headers: headers }).subscribe({
          next: (response: any) => {
            this.isLoading = false;
            Swal.close();

            if (response.status) {
              Swal.fire({
                title: '¡Logrado!',
                text: response.mensaje,
                icon: 'success',
                timer: 2500,
                showConfirmButton: false
              });
              // Cerramos el modal enviando "true" para que la tabla principal se refresque
              this.dialogRef?.close(true);
            } else {
              Swal.fire('Atención', response.mensaje, 'error');
            }
          },
          error: (err) => {
            this.isLoading = false;
            Swal.close();
            console.error('Error API SINV:', err);
            Swal.fire('Error de Sistema', 'No se pudo procesar la solicitud en el servidor', 'error');
          }
        });
      }
    });
  }

  eliminarItem(row: any){

  }
}