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

  parseAndCompute(expressionParts: any[], row: any): number {
    let stack: any[] = [];
    let postfix: any[] = [];

    // Convert infix expression to postfix expression
    for (let part of expressionParts) {
      if (typeof part === 'number' || part.match(/^[A-Za-z]+$/)) {
        postfix.push(part);
      } else if (part === '(') {
        stack.push(part);
      } else if (part === ')') {
        while (stack.length && stack[stack.length - 1] !== '(') {
          postfix.push(stack.pop());
        }
        stack.pop();
      } else {
        while (stack.length && this.getPrecedence(part) <= this.getPrecedence(stack[stack.length - 1])) {
          postfix.push(stack.pop());
        }
        stack.push(part);
      }
    }

    while (stack.length) {
      postfix.push(stack.pop());
    }

    // Evaluate postfix expression
    let resultStack: number[] = [];
    for (let part of postfix) {
      if (typeof part === 'number') {
        resultStack.push(part);
      } else if (part.match(/^[A-Za-z]+$/)) {
        const value = parseFloat(row[part]);
        if (!isNaN(value)) {
          resultStack.push(value);
        } else {
          throw new Error(`Invalid value for column: ${part}`);
        }
      } else {
        const b = resultStack.pop();
        const a = resultStack.pop();

        if (a === undefined || b === undefined) {
          throw new Error(`Invalid arithmetic operation with undefined operands`);
        }

        switch (part) {
          case '+':
            resultStack.push(a + b);
            break;
          case '-':
            resultStack.push(a - b);
            break;
          case '*':
            resultStack.push(a * b);
            break;
          case '/':
            if (b === 0) {
              throw new Error(`Division by zero`);
            }
            resultStack.push(a / b);
            break;
          default:
            throw new Error(`Unknown operator: ${part}`);
        }
      }
    }

    const result = resultStack.pop();
    if (result === undefined) {
      throw new Error(`Failed to compute result`);
    }
    return result;
  }

  getPrecedence(op: string): number {
    switch (op) {
      case '+':
      case '-':
        return 1;
      case '*':
      case '/':
        return 2;
      default:
        return 0;
    }
  }

  onSubmit(): void {
    const expressions = this.getExpressions(0);
    const equationParts: any[] = [];
    const chosenColumns: string[] = [];
  
    for (let i = 0; i < expressions.length; i++) {
      const control = expressions.at(i);
      if (control.get('column')) {
        const column = control.get('column')?.value;
        if (column) {
          equationParts.push(column);
          if (!chosenColumns.includes(column)) {
            chosenColumns.push(column);
          }
        }
      } else if (control.get('sign')) {
        equationParts.push(control.get('sign')?.value);
      } else if (control.get('parenthesis')) {
        equationParts.push(control.get('parenthesis')?.value);
      }
    }
  
    if (this.isValidMathExpression()) {
      this.validationMessage = 'Valid expression';
      this.showAdditionalButtons = true;
  
      this.displayedColumns = [...chosenColumns, 'Result'];
  
      // Evaluate the equation for each row
      this.fileContentTest.forEach((row) => {
        try {
          const result = this.parseAndCompute(equationParts, row);
          row['Result'] = result;
        } catch (error) {
          if (error instanceof Error) {
            console.error(error);
            this.validationMessage = `Error: ${error.message}`;
          } else {
            console.error('Unexpected error', error);
            this.validationMessage = 'Unexpected error occurred';
          }
          this.showAdditionalButtons = false;
        }
      });
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
