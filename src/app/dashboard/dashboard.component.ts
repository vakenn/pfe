import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { IndexedDBService } from '../indexed-db.service';
import * as d3 from 'd3';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ]
})
export class DashboardComponent implements OnInit {

  private data = [
    {"Framework": "Vue", "Stars": "166443", "Released": "2014"},
    {"Framework": "React", "Stars": "150793", "Released": "2013"},
    {"Framework": "Angular", "Stars": "62342", "Released": "2016"},
    {"Framework": "Backbone", "Stars": "27647", "Released": "2010"},
    {"Framework": "Ember", "Stars": "21471", "Released": "2011"},
  ];
  private svg: any;
  private margin = 50;
  private width = 750 - (this.margin * 2);
  private height = 400 - (this.margin * 2);
  

  fileContentTest: any[] = [];
  fileContentAff: any[] = [];
  paginatedResults: any[] = [];
  displayedColumns: string[] = [];

  chartForm!: FormGroup;
  get graphForms(): FormArray {
    return this.chartForm.get('graphForms') as FormArray;
  }

  graphTypeColumnMapping = [
    { chartType: 'Pie_chart', numberOfColumns: 1 },
    { chartType: 'Bar_chart', numberOfColumns: 2 },
    { chartType: 'Dual_Bar_chart', numberOfColumns: 3 }
  ];

  constructor(
    private indexedDBService: IndexedDBService,
    private fb: FormBuilder, 
    private http: HttpClient) {}

  async ngOnInit() {
    this.chartForm = this.fb.group({
      numberOfGraphs: [1, Validators.required],
      graphForms: this.fb.array([this.createGraphFormGroup()])
    });

    this.chartForm.get('numberOfGraphs')?.valueChanges.subscribe((value) => {
      this.updateGraphForms(value);
    });

    const fileContent: string | null | undefined = await this.indexedDBService.getItem('extractedData');
    if (fileContent !== undefined && fileContent !== null) {
      this.fileContentTest = JSON.parse(fileContent);
      if (this.fileContentTest.length > 0) {
        this.displayedColumns = this.fileContentTest[0][0];
      }
    }
  }

  updateGraphForms(numberOfGraphs: number) {
    const graphForms = this.chartForm.get('graphForms') as FormArray;
    while (graphForms.length !== 0) {
      graphForms.removeAt(0);
    }

    for (let i = 0; i < numberOfGraphs; i++) {
      graphForms.push(this.createGraphFormGroup());
    }
  }

  createGraphFormGroup() {
    const formGroup = this.fb.group({
      chartType: ['Pie_chart', Validators.required],
      columns: this.fb.array([])
    });

    // Initialize columns based on default chart type (Pie_chart)
    this.initializeColumns(formGroup, 'Pie_chart');

    // Subscribe to changes in chartType to update columns dynamically
    formGroup.get('chartType')?.valueChanges.subscribe((chartType) => {
      if (typeof chartType === 'string') {
        this.initializeColumns(formGroup, chartType);
      } else {
        // Handle if chartType is null or not a string (though it should be a string based on the form)
        console.error('Invalid chartType:', chartType);
      }
    });

    return formGroup;
  }

  initializeColumns(formGroup: FormGroup, chartType: string) {
    const numberOfColumns = this.getNumberOfColumns(chartType);
    const columnsArray = formGroup.get('columns') as FormArray;

    // Remove existing columns
    while (columnsArray.length !== 0) {
      columnsArray.removeAt(0);
    }

    // Add new columns
    for (let i = 0; i < numberOfColumns; i++) {
      columnsArray.push(this.createColumnFormGroup());
    }
  }

  getNumberOfColumns(chartType: string): number {
    const mapping = this.graphTypeColumnMapping.find(item => item.chartType === chartType);
    return mapping ? mapping.numberOfColumns : 0;
  }

  createColumnFormGroup() {
    return this.fb.group({
      columnName: ['', Validators.required]
    });
  }

  createGraph(index: number) {
    this.createSvg();
    this.drawBars(this.data);
  }

  drawChart(data: any, index: number) {
    // Implement drawChart logic if needed
  }

  showError(message: string) {
    // Implement showError logic if needed
  }


  private createSvg(): void {
    this.svg = d3.select("figure#bar")
    .append("svg")
    .attr("width", this.width + (this.margin * 2))
    .attr("height", this.height + (this.margin * 2))
    .append("g")
    .attr("transform", "translate(" + this.margin + "," + this.margin + ")");
  }

  private drawBars(data: any[]): void {
    // Create the X-axis band scale
    const x = d3.scaleBand()
    .range([0, this.width])
    .domain(data.map(d => d.Framework))
    .padding(0.2);
  
    // Draw the X-axis on the DOM
    this.svg.append("g")
    .attr("transform", "translate(0," + this.height + ")")
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("text-anchor", "end");
  
    // Create the Y-axis band scale
    const y = d3.scaleLinear()
    .domain([0, 200000])
    .range([this.height, 0]);
  
    // Draw the Y-axis on the DOM
    this.svg.append("g")
    .call(d3.axisLeft(y));
  
    // Create and fill the bars
    this.svg.selectAll("bars")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", (d: any) => x(d.Framework))
    .attr("y", (d: any) => y(d.Stars))
    .attr("width", x.bandwidth())
    .attr("height", (d: any) => this.height - y(d.Stars))
    .attr("fill", "#d04a35");
  }

}