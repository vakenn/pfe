import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FileUploadService } from '../file-upload.service';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatCardModule,
    MatListModule,
    CommonModule
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  selectedFile: File | null = null;
  isUploading: boolean = false;
  progress: number = 0;
  files: any[] = [];

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private router: Router,
    private fileUploadService: FileUploadService
  ) {}

  ngOnInit(): void {
    this.loadUploadedFiles();
  }

  private loadUploadedFiles(): void {
    this.fileUploadService.getUploadedFiles().subscribe(
      data => {
        this.files = data;
      },
      error => {
        console.error('Error fetching uploaded files', error);
      }
    );
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.selectedFile = event.dataTransfer.files[0];
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.selectedFile) {
      const allowedExtensions = ['csv', 'xml', 'json', 'xlsx', 'xls', 'txt'];
      const extension = this.selectedFile.name.split('.').pop()?.toLowerCase() ?? '';

      if (allowedExtensions.includes(extension)) {
        this.isUploading = true;
        const formData = new FormData();
        formData.append('file', this.selectedFile);

        this.http.post(this.fileUploadService.uploadUrl, formData, {
          reportProgress: true,
          observe: 'events'
        }).subscribe(
          (event: HttpEvent<any>) => {
            if (event.type === HttpEventType.UploadProgress && event.total) {
              this.progress = Math.round((100 * event.loaded) / event.total);
            } else if (event instanceof HttpResponse) {
              console.log('File uploaded successfully', event.body);
              this.isUploading = false;
              this.showSuccessToast('File uploaded successfully!');
              this.loadUploadedFiles(); // Refresh the file list
            }
          },
          error => {
            console.error('File upload error', error);
            this.showErrorToast('File upload failed. Please try again.');
            this.isUploading = false;
          }
        );
      } else {
        console.error(`Unsupported file extension: ${extension}`);
        this.showErrorToast('Unsupported file extension');
      }
    }
  }

  getFileIcon(extension: string): string {
    const fileIcons = {
      'csv': 'insert_drive_file',
      'xls': 'insert_drive_file',
      'xlsx': 'insert_drive_file',
      'json': 'insert_drive_file',
      'xml': 'insert_drive_file',
      'txt': 'insert_drive_file'
    };
    return fileIcons[extension as keyof typeof fileIcons] || 'file_generic';
  }

  viewFile(filename: string): void {
    this.router.navigate(['/table', filename]);
  }

  private showErrorToast(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['error-toast', 'centered-snackbar']
    });
  }

  private showSuccessToast(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-toast', 'centered-snackbar']
    });
  }
}
