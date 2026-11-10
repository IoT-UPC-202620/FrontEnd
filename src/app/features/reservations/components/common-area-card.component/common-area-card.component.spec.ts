import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommonAreaCardComponent } from './common-area-card.component';
import { provideHttpClient } from '@angular/common/http';

describe('CommonAreaCardComponent', () => {
  let component: CommonAreaCardComponent;
  let fixture: ComponentFixture<CommonAreaCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonAreaCardComponent],
      providers: [provideHttpClient()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommonAreaCardComponent);
    component = fixture.componentInstance;
    component.commonArea = {
      id: 1,
      name: 'Pool',
      type: 'POOL',
      status: 'AVAILABLE',
      maxCapacity: 20,
      bookingType: 'SHARED',
      rules: null
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
