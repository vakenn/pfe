import { Component, OnInit } from '@angular/core';
import { IndexedDBService } from '../indexed-db.service';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-tables',
  templateUrl: './tables.component.html',
  styleUrls: ['./tables.component.css'],
  standalone:true,
  imports:[CommonModule]
})
export class TablesComponent implements OnInit {
  fileContentTest: any[] = [];

  constructor(private indexedDBService: IndexedDBService) {}

  async ngOnInit(): Promise<void> {
    const fileContent: string | null | undefined = await this.indexedDBService.getItem('extractedData');
    if (fileContent !== undefined && fileContent !== null) {
      this.fileContentTest = JSON.parse(fileContent);
      console.log(this.fileContentTest);
    }
  }
}
