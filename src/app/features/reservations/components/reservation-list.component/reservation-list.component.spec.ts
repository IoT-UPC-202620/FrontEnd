import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReservationListComponent } from './reservation-list.component';
import { provideHttpClient } from '@angular/common/http';

describe('ReservationListComponent', () => {
  let component: ReservationListComponent;
  let fixture: ComponentFixture<ReservationListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReservationListComponent],
      providers: [provideHttpClient()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReservationListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
