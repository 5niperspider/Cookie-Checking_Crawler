import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface SessionRequest {
  url: string;
  config: number[];
}

interface SessionResponse {
  sessionId?: string;
  status?: string;
  
}

@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './component.html',
  styleUrl: './component.css',
})
export class MyComponent {
  url = '';
  result: SessionResponse | null = null;
  loading = false;
  error = '';
  
  // eslint-disable-next-line @angular-eslint/prefer-inject
  constructor(private http: HttpClient) {}
   sendRequest() {
    this.loading = true;
    this.error = '';
    this.result = null;
    
    const apiUrl = 'http://localhost:3000/api/session';
    const body: SessionRequest = {
      url: this.url,
      config: [1, 3]
    };
    
    this.http.post<SessionResponse>(apiUrl, body).subscribe({
      next: (response) => {
        console.log('Erfolg:', response);
        this.result = response;
        this.loading = false;
      },
      error: (error) => {
        console.error('Fehler:', error);
        this.error = `Fehler: ${error.status} - ${error.statusText || error.message}`;
        this.loading = false;
      }
    });
  }
  
}