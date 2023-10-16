import { TestBed } from '@angular/core/testing';

import { SnifferService } from './sniffer.service';

describe('SnifferService', () => {
  let service: SnifferService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SnifferService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
