import { Component, OnInit } from '@angular/core';
import { IndexedDBService } from '../indexed-db.service';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule
  ]
})
export class AnalyticsComponent implements OnInit {
  fileContentTest: any[] = [];
  displayedColumns: string[] = [];
  formulaForm: FormGroup;
  validationMessage: string = '';
  showAdditionalButtons: boolean = false;

  constructor(
    private indexedDBService: IndexedDBService,
    private fb: FormBuilder
  ) {
    this.formulaForm = this.fb.group({
      formulas: this.fb.array([
        this.fb.array([this.createColumnGroup(), this.createSignGroup(), this.createColumnGroup()])
      ])
    });
  }

  async ngOnInit(): Promise<void> {
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
    expressions.insert(expressions.length , this.createColumnGroup());
  }

  addSignField(): void {
    const expressions = this.getExpressions(0);
    expressions.insert(expressions.length , this.createSignGroup());
  }

  addParenthesis(parenthesis: string): void {
    const expressions = this.getExpressions(0);
    expressions.insert(expressions.length , this.createParenthesisGroup(parenthesis));
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
          // Allow negative sign after another sign
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
    if (this.isValidMathExpression()) {
      this.validationMessage = 'Valid expression';
      this.showAdditionalButtons = true;
    } else {
      this.validationMessage = 'Invalid expression';
      this.showAdditionalButtons = false;
    }
  }

  addCreatedColumn(): void {
    // Add your logic to handle adding the created column
  }

  clearForm(): void {
    this.formulaForm.reset();
    this.showAdditionalButtons = false;
    this.validationMessage = '';
  }
}
