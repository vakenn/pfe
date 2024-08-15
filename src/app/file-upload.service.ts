import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private apiUrl = 'http://localhost:5000/api/upload';
  private apiUrlT = 'http://localhost:5000/api/insert_dynamic';
  public uploadUrl = this.apiUrl; // Added this line

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
    return this.http.post<any>(this.apiUrlT, file, { headers });
  }
  getUploadedFiles(): Observable<any> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => response.files)  // Extracts the `files` array from the response
    );
  }
}
