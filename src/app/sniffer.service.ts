// sniffer.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SnifferService {
  private apiUrl: string = 'futureAPIService';

  constructor(private http: HttpClient) {}

  sendRequest(requestPayload: any): Observable<any> {
  
    return this.http.post(this.apiUrl, requestPayload);
  }
}