import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as XLSX from 'xlsx';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  selectedFile: File | null = null;

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
        reader.onload = () => {
          const fileContent = reader.result as string;
          sessionStorage.setItem('uploadedFile', fileContent);
          console.log('File content saved in session storage.');
          const fileContentTest = sessionStorage.getItem('uploadedFile')?? '';
          console.log(fileContentTest);
          console.log(extractData(fileContentTest,extension))
        };
        reader.readAsDataURL(this.selectedFile);
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


function extractData(fileContent: string, fileType: string): any[] {
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
    const obj : { [key: string]: any } = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    data.push(obj);
  }
  return data;
}

function extractXMLData(fileContent: string): any[] {
  const xmlDoc = new DOMParser().parseFromString(fileContent, 'text/xml');
  const data = [];
  const elements = xmlDoc.querySelectorAll('element');
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const obj : { [key: string]: any } = {};
    obj[element.tagName] = element.textContent;
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
  const workbook = XLSX.read(fileContent, { type: 'array' });
  const data: any[][] = [];

  for (const sheetName in workbook.Sheets) {
    if (workbook.Sheets.hasOwnProperty(sheetName)) {
      const sheet = workbook.Sheets[sheetName];
      const sheetData: any[] = [];

      for (let i = 1; sheet[`A${i}`] !== undefined; i++) {
        const row: any[] = [];
        for (let j = 1; sheet[`${String.fromCharCode(64 + j)}${i}`] !== undefined; j++) {
          row.push(sheet[`${String.fromCharCode(64 + j)}${i}`].v);
        }
        sheetData.push(row);
      }

      data.push(sheetData);
    }
  }

  return data;
}

function extractXLSData(fileContent: string): any[][] {
  const workbook = XLSX.read(fileContent, { type: 'array' });
  const data: any[][] = [];

  for (const sheetName in workbook.Sheets) {
    if (workbook.Sheets.hasOwnProperty(sheetName)) {
      const sheet = workbook.Sheets[sheetName];
      const sheetData: any[] = [];

      for (let i = 1; sheet[`A${i}`]; i++) {
        const row: any[] = [];
        for (let j = 1; sheet[`${String.fromCharCode(64 + j)}${i}`]; j++) {
          row.push(sheet[`${String.fromCharCode(64 + j)}${i}`].v);
        }
        sheetData.push(row);
      }

      data.push(sheetData);
    }
  }

  return data;
}

function extractTXTData(fileContent: string): any[] {
  const rows = fileContent.split('\n');
  const data = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].split(',');
    data.push(row);
  }
  return data;
}
