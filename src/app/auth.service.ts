import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private usersUrl = 'assets/users.json'; // Path to your users.json file
  private registerUrl = '/register'; 
  private loginUrl = '/login'; 
  constructor(private http: HttpClient) { }


  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(this.usersUrl);
  }


  register(userData: any): Observable<any> {
    return this.http.get<any[]>(this.usersUrl).pipe(
      map(users => {
        const newUser = {
          id: users.length + 1,
          ...userData
        };
        users.push(newUser); 
        return { success: true };
      }),
      catchError(error => {
        console.error('Failed to register user', error);
        return of({ success: false, error });
      })
    );
  }


  login(username: any, userpwd: any): Observable<any> {
    return this.http.get<any[]>(this.usersUrl).pipe(
      map(users => {
        const user = users.find(u => u.name === username && u.password === userpwd);
        if (user) {
          return { success: true, user };
        } else {
          return { success: false, error: 'User not found or incorrect password' };
        }
      }),
      catchError(error => {
        console.error('Failed to authenticate user', error);
        return of({ success: false, error });
      })
    );
  }
}
