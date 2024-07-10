import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private apiUrl = 'http://localhost:5000/api/upload';
  private apiUrlT = 'http://localhost:5000/api/insert_dynamic';

  constructor(private http: HttpClient) {}

  uploadFile(file: File): Observable<any> {
    const formData: FormData = new FormData();
    formData.append('file', file, file.name);

    const headers = new HttpHeaders();

    return this.http.post<any>(this.apiUrl, formData, { headers });
  }

  test(file: any[]): Observable<any> {
    console.log('file', file);

    const headers = new HttpHeaders();
    return this.http.post<any>(this.apiUrlT,file, { headers });
  }
}
