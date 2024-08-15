import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { HttpClient } from '@angular/common/http'; // Make sure you import HttpClient if you need to fetch data

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

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchTableData();
  }

  fetchTableData(): void {
    // Replace with the actual API endpoint and parameters
    this.http.get<any>('http://localhost:5000/api/get_table_data?table_name=ECH19042024').subscribe(
      (data: any) => {
        this.fileContentTest = data; // Assuming 'data' is the array of rows
        if (this.fileContentTest.length > 0) {
          this.displayedColumns = Object.keys(this.fileContentTest[0]);
          this.updateDataSource();
        }
      },
      error => {
        console.error('Error fetching table data', error);
      }
    );
  }

  updateDataSource(): void {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.fileContentAff = this.fileContentTest.slice(startIndex, endIndex);
    this.dataSource.data = this.fileContentAff;
    if (this.paginator) {
      this.paginator.pageIndex = this.currentPage;
    }
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize; // Adjust pageSize if needed
    this.updateDataSource();
  }
}
