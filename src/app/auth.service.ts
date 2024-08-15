import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { User } from './models/user.model'; 

function wait(seconds: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, seconds * 500); 
  });
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private usersUrl = 'http://localhost:5000/api/users'; 
  public users: User[] = [];

  constructor(private http: HttpClient) {
    this.loadUsers();
    wait(1).then(() => {
      console.log('Users in auth:', this.users);
    });
  }

  private loadUsers(): void {
    console.log('Fetching users...');
    this.http.get<{ users: any[] }>(this.usersUrl).pipe(
      map(data => {
        console.log('Data fetched:', data);
        this.users = data.users.map(user => new User(user.id, user.email, user.password));
        console.log('Mapped users:', this.users);
        return this.users;
      })
    ).subscribe(
      users => {
        this.users = users;
        console.log('Users loaded:', this.users);
      },
      error => {
        console.error('Error loading users:', error);
      }
    );
  }

  getUsers(): Observable<User[]> {
    return of(this.users);
  }

  login(username: string, password: string): boolean {
    const user = this.users.find(u => u.email === username && u.password === password);
    return !!user;
  }

  register(name: string, password: string): Observable<User> {
    const newUser = new User(this.users.length + 1, name, password);
    this.users.push(newUser);
    console.log('Updated users:', this.users);
    this.saveUsers().subscribe(
      () => console.log('Users saved successfully'),
      error => console.error('Error saving users:', error)
    );
    return of(newUser);
  }

  private saveUsers(): Observable<any> {
    return this.http.put(this.usersUrl, { users: this.users });
  }
}
