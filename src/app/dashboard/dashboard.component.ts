import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { IndexedDBService } from '../indexed-db.service';
import * as d3 from 'd3';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    ReactiveFormsModule
  ]
})
export class DashboardComponent implements OnInit {

  private data: any[] = [];
  private svg: any;
  private margin = 50;
  private width = 750 - (this.margin * 2);
  private height = 400 - (this.margin * 2);

  fileContentTest: any[] = [];
  fileContentAff: any[] = [];
  paginatedResults: any[] = [];
  displayedColumns: string[] = [];
  columnData: any[] = [];

  chartForm!: FormGroup;
  get graphForms(): FormArray {
    return this.chartForm.get('graphForms') as FormArray;
  }

  graphTypeColumnMapping = [
    { chartType: '01_line_chart', minColumns: 2, maxColumns: 3 },
    { chartType: '02_multi_series_line_chart', minColumns: 2, maxColumns: 2 },
    { chartType: '03_bar_chart', minColumns: 2, maxColumns: 4 },
    { chartType: '04_stacked_bar_chart', minColumns: 2, maxColumns: 4 },
    { chartType: '05_brush_zoom', minColumns: 2, maxColumns: 3 },
    { chartType: '06_pie_chart', minColumns: 1, maxColumns: 1 },
    { chartType: '07_donut_chart', minColumns: 1, maxColumns: 1 }
  ];

  constructor(
    private indexedDBService: IndexedDBService,
    private fb: FormBuilder,
    private http: HttpClient) { }

  ngOnInit() {
    this.chartForm = this.fb.group({
      numberOfGraphs: [1, Validators.required],
      graphForms: this.fb.array([this.createGraphFormGroup()])
    });
    this.chartForm.get('numberOfGraphs')?.valueChanges.subscribe((value) => {
      this.updateGraphForms(value);
    });
    this.fetchData();
  }

  getAvailableColumns(index: number): string[] {
    const chartType = (this.graphForms.at(index) as FormGroup).get('chartType')?.value;
    const mapping = this.graphTypeColumnMapping.find(item => item.chartType === chartType);
    const minColumns = mapping ? mapping.minColumns : 0;
    const maxColumns = mapping ? mapping.maxColumns : 0;

    const availableColumns: string[] = [];
    for (let i = minColumns; i <= maxColumns; i++) {
      availableColumns.push(`${i}`);
    }

    return availableColumns;
  }

  onChartTypeSelected(event: Event, index: number) {
    const selectedValue = (event.target as HTMLSelectElement).value;
    const graphFormGroup = this.graphForms.at(index) as FormGroup;
    graphFormGroup.patchValue({ chartType: selectedValue });
  this.columnData = []
    // Reset columns array when chart type changes
    graphFormGroup.setControl('columns', this.fb.array([]));
    this.initializeColumns(graphFormGroup, selectedValue);
  }
  

  fetchData() {
    this.http.get<any>('http://localhost:5000/api/get_column_names').subscribe(
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

  onColumnNameSelected(event: Event) {
    const selectedValue = (event.target as HTMLSelectElement).value;
    if (selectedValue) {
      this.http.get<any[]>(`http://localhost:5000/api/get_column_data?column_name=${selectedValue}`).subscribe(
        (data) => {
          if (this.columnData.length === 0) {
            this.columnData = data.map((d, index) => ({
              Framework: `Item ${index + 1}`,
              Stars: data[index] || 0
            }));
          } else if (this.columnData.length == 10) {
            this.columnData.push(...data.map((d, index) => ({
              Framework: `Item ${this.columnData.length + index + 1}`,
              Stars: data[index] || 0
            })));
          }
          console.log('Processed Column data:', this.columnData);
          this.updateChart();
        },
        (error) => {
          console.error('Error fetching column data:', error);
        }
      );
    }
  }
  

  updateGraphForms(numberOfGraphs: number) {
    const graphForms = this.chartForm.get('graphForms') as FormArray;

    graphForms.clear();

    for (let i = 0; i < numberOfGraphs; i++) {
      graphForms.push(this.createGraphFormGroup());
    }
  }

  createGraphFormGroup() {
    const formGroup = this.fb.group({
      chartType: ['01_line_chart', Validators.required], // Default to a valid chart type
      columns: this.fb.array([])
    });
  
    // Initialize columns based on the default chart type
    this.initializeColumns(formGroup, '01_line_chart');
  
    // Update columns when chart type changes
    formGroup.get('chartType')?.valueChanges.subscribe((chartType) => {
      if (typeof chartType === 'string') {
        this.initializeColumns(formGroup, chartType);
      } else {
        console.error('Invalid chartType:', chartType);
      }
    });
  
    return formGroup;
  }
  

  initializeColumns(formGroup: FormGroup, chartType: string) {
    const mapping = this.graphTypeColumnMapping.find(item => item.chartType === chartType);
    const numberOfColumns = mapping ? mapping.minColumns : 0;
    const columnsArray = formGroup.get('columns') as FormArray;

    while (columnsArray.length !== 0) {
      columnsArray.removeAt(0);
    }

    for (let i = 0; i < numberOfColumns; i++) {
      columnsArray.push(new FormControl(''));
    }
  }

  getNumberOfColumns(chartType: string): number {
    const mapping = this.graphTypeColumnMapping.find(item => item.chartType === chartType);
    return mapping ? mapping.minColumns : 0;
  }

  createColumnFormGroup() {
    return this.fb.group({
      columnName: ['', Validators.required]
    });
  }

  
  

createGraph(index: number) {
  const chartType = (this.graphForms.at(index) as FormGroup).get('chartType')?.value;
  switch (chartType) {
    case '01_line_chart':
      this.createLineChart(index);
      break;
    case '02_multi_series_line_chart':
      this.createMultiSeriesLineChart(index);
      break;
    case '03_bar_chart':
      this.createBarChart(index);
      break;
    case '04_stacked_bar_chart':
      this.createStackedBarChart(index);
      break;
    case '05_brush_zoom':
      this.createBrushZoom(index);
      break;
    case '06_pie_chart':
      this.createPieChart(index);
      break;
    case '07_donut_chart':
      this.createDonutChart(index);
      break;
    default:
      console.error('Unknown chart type:', chartType);
  }
}


updateChart() {
  // Check if SVG exists and clear previous chart
  if (this.svg) {
    this.svg.selectAll("*").remove(); // Clear the previous chart

    // Re-create SVG with the same index (0 or any appropriate index)
    this.createSvg("bar"); // Replace "bar" with the appropriate container ID

    // Draw the new chart with updated data
    this.drawBars(this.columnData);
  }
}

  
  private createSvg(containerId: string): void {
    const container = d3.select(`#${containerId}`);
    
    this.svg = container.append("svg")
      .attr("width", this.width + (this.margin * 2))
      .attr("height", this.height + (this.margin * 2))
      .append("g")
      .attr("transform", "translate(" + this.margin + "," + this.margin + ")");
  }
  

  private createBarChart(index: number): void {
    const containerId = `bar-chart-${index}`;
    this.createSvg(containerId);
    this.drawBars(this.columnData);
  }

  private drawBars(data: any[]): void {
    if (!data || data.length === 0) return;

    const x = d3.scaleBand()
      .range([0, this.width])
      .domain(data.map(d => d.Framework))
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data.map(d => d.Stars)) || 0])
      .range([this.height, 0]);

    this.svg.append("g")
      .attr("transform", "translate(0," + this.height + ")")
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "translate(-10,0)rotate(-45)")
      .style("text-anchor", "end");

    this.svg.append("g")
      .call(d3.axisLeft(y));

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

  
    private createLineChart(index: number): void {
      const containerId = `line-chart-${index}`;
      this.createSvg(containerId);
      this.drawLineChart(this.columnData);
    }

    private drawLineChart(data: any[]): void {
      if (!data || data.length === 0) return;
    
      const x = d3.scaleBand()
        .range([0, this.width])
        .domain(data.map(d => d.Framework))
        .padding(0.2);
    
      const y = d3.scaleLinear()
        .domain([0, d3.max(data.map(d => d.Stars)) || 0])
        .range([this.height, 0]);
    
      this.svg.append("g")
        .attr("transform", "translate(0," + this.height + ")")
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");
    
      this.svg.append("g")
        .call(d3.axisLeft(y));
    
      this.svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#69b3a2")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
          .x((d: any) => x(d.Framework) || 0)
          .y((d: any) => y(d.Stars) || 0)
        );
    }
    

  private createMultiSeriesLineChart(index: number): void {
      const containerId = `multi_series_line_chart-${index}`;
      this.createSvg(containerId);
      this.drawMultiSeriesLineChart(this.columnData);
    }

    private drawMultiSeriesLineChart(data: { Framework: string, Stars: number }[]): void {
      if (!data || data.length === 0) return;
    
      const x = d3.scaleBand()
        .range([0, this.width])
        .domain(data.map(d => d.Framework))
        .padding(0.2);
    
      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Stars) || 0])
        .range([this.height, 0]);
    
      const color = d3.scaleOrdinal<string, string>(d3.schemeCategory10);
    
      const line = d3.line<{ Framework: string, Stars: number }>()
        .x((d: { Framework: string, Stars: number }) => x(d.Framework) || 0)
        .y((d: { Framework: string, Stars: number }) => y(d.Stars) || 0);
    
      const lines = this.svg.selectAll(".line")
        .data([data])
        .enter()
        .append("g")
        .attr("class", "line");
    
      lines.append("path")
        .attr("fill", "none")
        .attr("stroke", (d: { Framework: string, Stars: number }) => color(d.Framework))
        .attr("stroke-width", 1.5)
        .attr("d", line(data));
    
      this.svg.append("g")
        .attr("transform", "translate(0," + this.height + ")")
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");
    
      this.svg.append("g")
        .call(d3.axisLeft(y));
    }
    
  
  private createStackedBarChart(index: number): void {
      const containerId = `stacked_bar_chart-${index}`;
      this.createSvg(containerId);
      this.drawStackedBarChart(this.columnData);
    }
    private drawStackedBarChart(data: any[]): void {
      if (!data || data.length === 0) return;
    
      const keys = Object.keys(data[0]).filter(key => key !== 'Framework');
    
      const x = d3.scaleBand()
        .range([0, this.width])
        .domain(data.map(d => d.Framework))
        .padding(0.2);
    
      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d3.sum(keys, key => d[key] as number)) || 0])
        .range([this.height, 0]);
    
      const color = d3.scaleOrdinal<string>()
        .domain(keys)
        .range(d3.schemeCategory10);
    
      this.svg.append("g")
        .selectAll("g")
        .data(d3.stack().keys(keys)(data) as d3.Series<{ [key: string]: number }, string>[]) // Explicitly type 'd' here
        .enter().append("g")
        .attr("fill", (d: { key: string; }) => color(d.key))
        .selectAll("rect")
        .data((d: any) => d)
        .enter().append("rect")
        .attr("x", (d: { data: { Framework: string; }; }) => x(d.data.Framework) || 0)
        .attr("y", (d: d3.NumberValue[]) => y(d[1]) || 0)
        .attr("height", (d: d3.NumberValue[]) => y(d[0]) - y(d[1]) || 0)
        .attr("width", x.bandwidth());
    
      this.svg.append("g")
        .attr("transform", "translate(0," + this.height + ")")
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");
    
      this.svg.append("g")
        .call(d3.axisLeft(y));
    }
    
    

  private createBrushZoom(index: number): void {
      const containerId = `brush_zoom-${index}`;
      this.createSvg(containerId);
      this.drawBrushZoomChart(this.columnData);
    }
    private drawBrushZoomChart(data: any[]): void {
      if (!data || data.length === 0) return;
    
      const x = d3.scaleBand()
        .range([0, this.width])
        .domain(data.map(d => d.Framework))
        .padding(0.2);
    
      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Stars)])
        .range([this.height, 0]);
    
      this.svg.append("g")
        .attr("transform", "translate(0," + this.height + ")")
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");
    
      this.svg.append("g")
        .call(d3.axisLeft(y));
    
      this.svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", (d: any) => x(d.Framework) || 0)
        .attr("y", (d: any) => y(d.Stars) || 0)
        .attr("width", x.bandwidth())
        .attr("height", (d: any) => this.height - y(d.Stars))
        .attr("fill", "#69b3a2");
    }
    

  private createPieChart(index: number): void {
      const containerId = `pie_chart-${index}`;
      this.createSvg(containerId);
      this.drawPieChart(this.columnData);
    }
    private drawPieChart(data: any[]): void {
      if (!data || data.length === 0) return;
    
      const radius = Math.min(this.width, this.height) / 2;
      const color = d3.scaleOrdinal()
        .domain(data.map(d => d.Framework))
        .range(d3.schemeCategory10);
    
      const pie = d3.pie<any>()
        .value((d: any) =>d.Stars);
    
      const arcs = this.svg.selectAll(".arc")
        .data(pie(data))
        .enter()
        .append("g")
        .attr("class", "arc");
    
      arcs.append("path")
        .attr("d", d3.arc()
          .innerRadius(0)
          .outerRadius(radius)
        )
        .attr("fill", (d: any) => color(d.data.Framework))
        .attr("stroke", "white")
        .style("stroke-width", "2px");
    
      arcs.append("text")
        .attr("transform", (d: any) => "translate(" + d3.arc().centroid(d) + ")")
        .attr("text-anchor", "middle")
        .text((d: any) => d.data.Framework)
        .style("fill", "white")
        .style("font-size", 12);
    }
    

  private createDonutChart(index: number): void {
      const containerId = `donut_chart-${index}`;
      this.createSvg(containerId);
      this.drawDonutChart(this.columnData);
    }
    private drawDonutChart(data: any[]): void {
      if (!data || data.length === 0) return;
    
      const radius = Math.min(this.width, this.height) / 2;
      const innerRadius = radius * 0.5;
    
      const color = d3.scaleOrdinal()
        .domain(data.map(d => d.Framework))
        .range(d3.schemeCategory10);
    
      const pie = d3.pie<any>()
        .value((d: any) => d.Stars);
    
      const arcs = this.svg.selectAll("arc")
        .data(pie(data))
        .enter()
        .append("g")
        .attr("class", "arc");
    
      arcs.append("path")
        .attr("d", d3.arc()
          .innerRadius(innerRadius)
          .outerRadius(radius)
        )
        .attr("fill", (d: any) => color(d.data.Framework))
        .attr("stroke", "white")
        .style("stroke-width", "2px");
    
      arcs.append("text")
        .attr("transform", (d: any) => "translate(" + d3.arc().centroid(d) + ")")
        .attr("text-anchor", "middle")
        .text((d: any) => d.data.Framework)
        .style("fill", "white")
        .style("font-size", 12);
    }
    
}
