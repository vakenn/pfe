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

  addExpression(): void {
    const expressions = this.getExpressions(0);
    expressions.insert(expressions.length - 1, this.createSignGroup());
    expressions.insert(expressions.length - 1, this.createColumnGroup());
  }

  removeExpression(expressionIndex: number): void {
    const expressions = this.getExpressions(0);
    if (expressions.length > 3) { // Ensures at least one column sign column remains
      expressions.removeAt(expressionIndex);
      expressions.removeAt(expressionIndex - 1);
    }
  }

  onSubmit(): void {
    console.log(this.formulaForm.value);
  }
}
