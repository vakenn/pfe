import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as XLSX from 'xlsx';
import { IndexedDBService } from "../indexed-db.service";


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  selectedFile: File | null = null;

  constructor(private indexedDBService: IndexedDBService) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.selectedFile) {
      const allowedExtensions = ['csv', 'xml', 'json', 'xlsx', 'xls', 'txt'];
      const extension = this.selectedFile.name.split('.').pop() ?? '';
      if (allowedExtensions.includes(extension)) {
        const reader = new FileReader();
        reader.onload = async () => {
          const fileContent = reader.result as string;
          const extractedData = extractData(fileContent, extension);
          console.log(extractedData);
          await this.indexedDBService.setItem('extractedData', JSON.stringify(extractedData));
        };

        if (['xlsx', 'xls'].includes(extension)) {
          reader.readAsBinaryString(this.selectedFile);
        } else {
          reader.readAsText(this.selectedFile);
        }
      } else {
        console.error(`Unsupported file extension: ${extension}`);
        const erreurType = document.getElementById("erreurType");
        if (erreurType) {
          erreurType.innerHTML = "Unsupported file extension";
        }
      }
    }
  }
}

function extractData(fileContent: string, fileType: string): any[] | any[][] {
  switch (fileType) {
    case 'csv':
      return extractCSVData(fileContent);
    case 'xml':
      return extractXMLData(fileContent);
    case 'json':
      return extractJSONData(fileContent);
    case 'xlsx':
      return extractXLSXData(fileContent);
    case 'xls':
      return extractXLSData(fileContent);
    case 'txt':
      return extractTXTData(fileContent);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

function extractCSVData(fileContent: string): any[] {
  const rows = fileContent.split('\n');
  const headers = rows[0].split(',');
  const data = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i].split(',');
    const obj: { [key: string]: any } = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    data.push(obj);
  }
  return data;
}

function extractXMLData(fileContent: string): any[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(fileContent, 'application/xml');
  const elements = Array.from(xmlDoc.documentElement.children); // Convert HTMLCollection to array
  const data = [];
  
  for (const element of elements) {
    const obj: { [key: string]: any } = {};
    for (const child of Array.from(element.children)) { // Convert HTMLCollection to array
      obj[child.tagName] = child.textContent;
    }
    data.push(obj);
  }
  return data;
}

function extractJSONData(fileContent: string): any[] {
  try {
    const jsonData = JSON.parse(fileContent);
    return jsonData;
  } catch (error) {
    throw new Error('Invalid JSON data');
  }
}

function extractXLSXData(fileContent: string): any[][] {
  const workbook = XLSX.read(fileContent, { type: 'binary' });
  const data: any[][] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const sheetData: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    data.push(sheetData);
  }
  
  return data;
}

function extractXLSData(fileContent: string): any[] {
  return extractXLSXData(fileContent);
}

function extractTXTData(fileContent: string): any[] {
  const rows = fileContent.split('\n');
  const data = [];
  for (const row of rows) {
    data.push(row.split(','));
  }
  return data;
}
