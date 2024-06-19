import { Component, OnInit, ViewChild } from '@angular/core';
import { IndexedDBService } from '../indexed-db.service';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
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
    private router: Router
  ) {
    this.formulaForm = this.fb.group({
      formulas: this.fb.array([
        this.fb.array([this.createColumnGroup(), this.createSignGroup(), this.createColumnGroup()])
      ])
    });
  }

  async ngOnInit(): Promise<void> {

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
        if (sign === '-') {
          expectingColumn = false;
        } else if (expectingColumn) {
          isValid = false;
          break;
        } else {
          expectingColumn = true;
        }
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

    return isValid && openParentheses === 0;
  }

  onSubmit(): void {
    const expressions = this.getExpressions(0);
    const columns: string[] = [];
    let expressionStr = '';

    for (let i = 0; i < expressions.length; i++) {
      const control = expressions.at(i);
      if (control.get('column')) {
        const column = control.get('column')?.value;
        columns.push(column);
        expressionStr += `data["${column}"]`;
      } else if (control.get('sign')) {
        expressionStr += ` ${control.get('sign')?.value} `;
      } else if (control.get('parenthesis')) {
        expressionStr += control.get('parenthesis')?.value;
      }
    }

    if (this.isValidMathExpression()) {
      this.validationMessage = 'Valid expression';
      this.showAdditionalButtons = true;
      this.chosenColumns = columns;

      console.log('Expression:', expressionStr);
      console.log('Chosen columns:', columns);

      this.fileContentAff = this.fileContentTest[0].slice(1).map((row: any[]) => {
        const data: any = {};
        columns.forEach(column => {
          const columnIndex = this.displayedColumns.indexOf(column);
          data[column] = row[columnIndex];
        });
        try {
          data.result = eval(expressionStr);
        } catch (error) {
          data.result = 'Error';
        }
        return data;
      });
      let name = (document.getElementById("newCol") as HTMLInputElement).value;
      this.var = name;
      console.log(this.var);
      this.paginateResults();
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

  addCreatedColumn(): void {
    const newColumnName =this.var;  
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
        expressionStr += ` ${control.get('sign')?.value} `;
      } else if (control.get('parenthesis')) {
        expressionStr += control.get('parenthesis')?.value;
      }
    }
  
    return expressionStr;
  }
  

  clearForm(): void {
    this.formulaForm.reset();
    this.showAdditionalButtons = false;
    this.chosenColumns = [];
    this.fileContentAff = [];
    this.paginatedResults = [];
  }
}
