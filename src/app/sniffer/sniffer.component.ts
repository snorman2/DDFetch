import { Component } from '@angular/core';
import { SnifferService } from "../sniffer.service";
import { Observable } from 'rxjs';

@Component({
  selector: 'app-sniffer',
  templateUrl: './sniffer.component.html',
  styleUrls: ['./sniffer.component.scss']
})
export class SnifferComponent {
  constructor(private snifferService: SnifferService) {}

  // Modify sniff to return an Observable
  sniff(): Observable<any> {
    // Define your request payload as needed
    const requestPayload = {
      // ... Define your request payload here
    };

    // Return the observable
    return this.snifferService.sendRequest(requestPayload);
  }
}