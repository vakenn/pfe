import { Component, OnInit, ViewChild } from '@angular/core';
import { IndexedDBService } from '../indexed-db.service';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { Parser } from 'expr-eval';

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatPaginatorModule
  ]
})
export class AnalyticsComponent implements OnInit {
  var :string | any = '';
  fileContentTest: any[] = [];
  fileContentAff: any[] = [];
  paginatedResults: any[] = [];
  displayedColumns: string[] = [];
  chosenColumns: string[] = [];
  formulaForm: FormGroup;
  validationMessage: string = '';
  showAdditionalButtons: boolean = false;
  pageSize: number = 100;
  pageIndex: number = 0;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private indexedDBService: IndexedDBService,
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient

  ) {
    this.formulaForm = this.fb.group({
      formulas: this.fb.array([
        this.fb.array([this.createColumnGroup(), this.createSignGroup(), this.createColumnGroup()])
      ])
    });
  }

  async ngOnInit(): Promise<void> {
    this.fetchData();

    const username: string | null = sessionStorage.getItem('user');
    if (username !== null) {
      console.log(`Username is ${username}`);
    } else {
      this.router.navigate(['/login']);
    }

    const fileContent: string | null | undefined = await this.indexedDBService.getItem('extractedData');
    if (fileContent !== undefined && fileContent !== null) {
      this.fileContentTest = JSON.parse(fileContent);
      if (this.fileContentTest.length > 0) {
        this.displayedColumns = this.fileContentTest[0][0];
      }
    }
  }

  get formulas(): FormArray {
    return this.formulaForm.get('formulas') as FormArray;
  }

  getExpressions(formulaIndex: number): FormArray {
    return this.formulas.at(formulaIndex) as FormArray;
  }

  createColumnGroup(): FormGroup {
    return this.fb.group({
      column: ['', Validators.required]
    });
  }

  createSignGroup(): FormGroup {
    return this.fb.group({
      sign: ['', Validators.required]
    });
  }

  createParenthesisGroup(parenthesis: string): FormGroup {
    return this.fb.group({
      parenthesis: [parenthesis, Validators.required]
    });
  }

  addColumnField(): void {
    const expressions = this.getExpressions(0);
    expressions.insert(expressions.length, this.createColumnGroup());
  }

  addSignField(): void {
    const expressions = this.getExpressions(0);
    expressions.insert(expressions.length, this.createSignGroup());
  }

  addParenthesis(parenthesis: string): void {
    const expressions = this.getExpressions(0);
    expressions.insert(expressions.length, this.createParenthesisGroup(parenthesis));
  }

  removeExpression(expressionIndex: number): void {
    const expressions = this.getExpressions(0);
    if (expressions.length > 0) {
      expressions.removeAt(expressionIndex);
    }
  }

  isValidMathExpression(): boolean {
    const expressions = this.getExpressions(0);
    let isValid = true;
    let expectingColumn = true;
    let openParentheses = 0;
  
    for (let i = 0; i < expressions.length; i++) {
      const control = expressions.at(i);
      if (control.get('column')) {
        expectingColumn = false;
      } else if (control.get('sign')) {
        const sign = control.get('sign')?.value;
        if (!['+', '-', '*', '/'].includes(sign)) {
          isValid = false;
          break;
        }
        if (expectingColumn) {
          isValid = false;
          break;
        }
        expectingColumn = true;
      } else if (control.get('parenthesis')) {
        const parenthesis = control.get('parenthesis')?.value;
        if (parenthesis === '(') {
          openParentheses++;
          expectingColumn = true;
        } else if (parenthesis === ')') {
          openParentheses--;
          if (openParentheses < 0) {
            isValid = false;
            break;
          }
          expectingColumn = false;
        }
      }
    }
  
    return isValid && openParentheses === 0 && !expectingColumn;
  }
  

  

  
  
  onSubmit(): void {
    const expressions = this.getExpressions(0);
    const columns: string[] = [];
    const columnDataObservables: Observable<any[]>[] = [];
  
    // Gather column data observables
    for (let i = 0; i < expressions.length; i++) {
      const control = expressions.at(i);
      if (control.get('column')) {
        const column = control.get('column')?.value;
        columns.push(column);
        const columnDataObservable = this.http.get<any[]>(`http://localhost:5000/api/get_column_data?table_name=ECH19042024&column_name=${column}`);
        columnDataObservables.push(columnDataObservable);
      }
    }
  
    if (this.isValidMathExpression()) {
      this.validationMessage = 'Valid expression';
      this.showAdditionalButtons = true;
      this.chosenColumns = columns;
  
      forkJoin(columnDataObservables).subscribe({
        next: (results: any[][]) => {
          // Process column data
          const allColumnData = results.map(columnData => columnData.map(item => parseFloat(item) || 0));
          const maxLength = Math.max(...allColumnData.map(data => data.length));
          allColumnData.forEach(data => {
            while (data.length < maxLength) data.push(0); // Fill missing values with 0
          });
  
          // Calculate results
          this.fileContentAff = Array.from({ length: maxLength }).map((_, rowIndex) => {
            const data: any = {};
            let expressionStr = ''; // Initialize the expression string for each row
  
            columns.forEach((column, columnIndex) => {
              data[column] = allColumnData[columnIndex][rowIndex];
            });
  
            // Construct expression string using actual values
            for (let i = 0; i < expressions.length; i++) {
              const control = expressions.at(i);
              if (control.get('column')) {
                const column = control.get('column')?.value;
                expressionStr += data[column];
              } else if (control.get('sign')) {
                expressionStr += ` ${control.get('sign')?.value} `;
              } else if (control.get('parenthesis')) {
                expressionStr += control.get('parenthesis')?.value;
              }
            }
  
            let result;
            try {
              console.log('Expression to Evaluate:', expressionStr);
  
              const parser = new Parser();
              result = parser.evaluate(expressionStr);
            } catch (error) {
              console.error('Evaluation Error:', error);
              result = 'Error';
            }
  
            data.result = result;
            return data;
          });
  
          console.log('Processed Column Data:', this.fileContentAff);
          this.paginateResults();
        },
        error: (error: any) => {
          console.error('Error fetching column data:', error);
        }
      });
    } else {
      this.validationMessage = 'Invalid expression';
      this.showAdditionalButtons = false;
      this.fileContentAff = [];
    }
  }
  
  
  
  
  
  
  
  
  paginateResults(): void {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedResults = this.fileContentAff.slice(startIndex, endIndex);
  }

  pageChanged(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.paginateResults();
  }
  fetchData() {
    this.http.get<any>('http://localhost:5000/api/get_column_names?table_name=ECH19042024').subscribe(
      (response) => {
        if (response && response.columns && Array.isArray(response.columns)) {
          this.displayedColumns = response.columns;
        } else {
          console.error('Invalid response format for column names:', response);
        }
      },
      (error) => {
        console.error('Error fetching column names:', error);
      }
    );
  }

  addCreatedColumn(): void {
    const newColumnName = this.var;  
    this.displayedColumns.push(newColumnName);
  
    this.fileContentTest[0].forEach((row: any[], rowIndex: number) => {
      if (rowIndex === 0) {
        row.push(newColumnName);
      } else {
        const data: any = {};
        this.chosenColumns.forEach(column => {
          const columnIndex = this.displayedColumns.indexOf(column);
          data[column] = row[columnIndex];
        });
        try {
          row.push(eval(this.generateExpressionString()));
        } catch (error) {
          row.push('Error');
        }
      }
    });
  
    this.paginateResults();
  }
  
  generateExpressionString(): string {
    const expressions = this.getExpressions(0);
    let expressionStr = '';
  
    for (let i = 0; i < expressions.length; i++) {
      const control = expressions.at(i);
      if (control.get('column')) {
        const column = control.get('column')?.value;
        expressionStr += `data["${column}"]`;
      } else if (control.get('sign')) {
        const sign = control.get('sign')?.value;
        if (['+', '-', '*', '/'].includes(sign)) {
          expressionStr += ` ${sign} `;
        }
      } else if (control.get('parenthesis')) {
        expressionStr += control.get('parenthesis')?.value;
      }
    }
  
    return expressionStr.trim();
  }
  
  
  clearForm(): void {
    this.formulaForm.reset();
    this.showAdditionalButtons = false;
    this.chosenColumns = [];
    this.fileContentAff = [];
    this.paginatedResults = [];
  }
}
