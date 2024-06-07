import { Component, OnInit, ViewChild } from '@angular/core';
import { IndexedDBService } from '../indexed-db.service';
import { CommonModule } from '@angular/common';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';

@Component({
  selector: 'app-tables',
  templateUrl: './tables.component.html',
  styleUrls: ['./tables.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    MatPaginatorModule,
    MatTableModule
  ]
})
export class TablesComponent implements OnInit {
  fileContentTest: any[] = [];
  fileContentAff: any[] = [];
  displayedColumns: string[] = [];
  dataSource = new MatTableDataSource<any>([]);
  pageSize = 100;
  currentPage = 0;

  @ViewChild(MatPaginator) paginator: MatPaginator | undefined;

  constructor(private indexedDBService: IndexedDBService) {}

  async ngOnInit(): Promise<void> {
    const fileContent: string | null | undefined = await this.indexedDBService.getItem('extractedData');
    if (fileContent !== undefined && fileContent !== null) {
      this.fileContentTest = JSON.parse(fileContent);
      if (this.fileContentTest.length > 0) {
        this.displayedColumns = this.fileContentTest[0];
        this.updateDataSource();
      }
    }
  }

  updateDataSource(): void {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    const pageData = this.fileContentTest[0].slice(startIndex, endIndex);
    this.fileContentAff = pageData;
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = 100;
    this.updateDataSource();
  }
}
