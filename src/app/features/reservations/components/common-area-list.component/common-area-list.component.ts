import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import { CommonAreaCardComponent } from '../common-area-card.component/common-area-card.component';
import { CommonAreaService } from '../../services/common-area.service';
import { CommonArea } from '../../model/common-area.model';

@Component({
  selector: 'app-common-area-list',
  standalone: true,
  imports: [CommonAreaCardComponent],
  templateUrl: './common-area-list.component.html',
})
export class CommonAreaListComponent implements OnInit {
  commonAreas: CommonArea[] = [];
  @Output() editRules = new EventEmitter<CommonArea>();
  @Output() statusChanged = new EventEmitter<CommonArea>();
  @Output() viewHistory = new EventEmitter<CommonArea>();

  constructor(private commonAreaService: CommonAreaService) {}

  ngOnInit(): void {
    this.commonAreaService.getAll().subscribe((areas) => {
      this.commonAreas = areas;
      this.loadAreas();

    });
  }
  loadAreas(): void {
    this.commonAreaService.getAll().subscribe({
      next: (areas) => {
        this.commonAreas = areas;
      },
      error: (error) => {
        console.error('Error loading common areas:', error);
      }
    });
  }
  onEditRules(area: CommonArea) {
    this.editRules.emit(area);
  }
  onStatusChanged(area: CommonArea) {
    this.statusChanged.emit(area);
  }
  onViewHistory(area: CommonArea) {
    this.viewHistory.emit(area);
  }
}
