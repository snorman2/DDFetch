import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SnifferComponent } from './sniffer.component';

describe('SnifferComponent', () => {
  let component: SnifferComponent;
  let fixture: ComponentFixture<SnifferComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SnifferComponent]
    });
    fixture = TestBed.createComponent(SnifferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
