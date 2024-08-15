import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormArray, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { IndexedDBService } from '../indexed-db.service';
import { FormControl } from '@angular/forms';
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

  private firstColumnData: number[] = []; // Store the first selected column's data
  private secondColumnData: number[] = []; // Store the sorted x-axis data
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


 

onColumnNameSelected(event: Event) {
  const selectedValue = (event.target as HTMLSelectElement).value;

  if (selectedValue) {
    this.http.get<any[]>(`http://localhost:5000/api/get_column_data?table_name=ECH19042024&column_name=${selectedValue}`).subscribe(
      (data) => {
        console.log('Raw Data:', data); // Log raw data
        if (data && Array.isArray(data)) {
          if (this.firstColumnData.length === 0) {
            // First selection: Store data in firstColumnData
            this.firstColumnData = data.map(item => item !== undefined ? item : 0);
            this.columnData = this.firstColumnData.map((stars, index) => ({
              Framework: `Item ${index + 1}`, // Placeholder for Framework
              Stars: stars
            }));
          } else if (this.secondColumnData.length === 0) {
            // Second selection: Store and sort the second column data
            this.secondColumnData = data.map(item => item !== undefined ? item : 0).sort((a, b) => a - b);
            
            // Build the tree structure
            const buildTree = (data: number[]): any => {
              // Build a hierarchical tree structure based on sorted data
              // Here we assume a simple structure where each node has no children
              return data.map((value, index) => ({
                name: `Node ${index + 1}`,
                value: value,
                children: [] // Add children if applicable
              }));
            };

            const treeData = buildTree(this.secondColumnData);
            this.columnData = this.firstColumnData.map((stars, index) => ({
              Framework: treeData[index] ? treeData[index].value : `Item ${index + 1}`,
              Stars: stars  // Keep Stars from the first column
            }));
          } else {
            // Additional logic for further selections if needed
          }

          console.log('Processed Column Data:', this.columnData);
          this.updateChart();
        } else {
          console.error('Invalid response format:', data);
        }
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

  private create_Svg(containerId: string, isDonut: boolean = false): void {
    this.svg = d3.select(`#${containerId}`)
      .append("svg")
      .attr("width", this.width)
      .attr("height", this.height)
      .attr("viewBox", `0 0 ${this.width} ${this.height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .append("g")
      .attr("transform", `translate(${this.width / 2}, ${this.height / 2})`);
  }
  
  //////////////////////////////////////////
  private createBarChart(index: number): void {
  const containerId = `bar-chart-${index}`;
  this.createSvg(containerId);
  this.drawBars(this.columnData);
  }
  private drawBars(data: any[]): void {
  if (!data || data.length === 0) return;

  // Define scales
  const x = d3.scaleBand()
    .range([0, this.width])
    .domain(data.map(d => d.Framework || ''))  // X axis labels from data.Framework
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => parseFloat(d.Stars)) || 0])  // Ensure Stars is treated as a number
    .nice()  // Add some space at the top
    .range([this.height, 0]);

  // Clear previous content
  this.svg.selectAll('*').remove();

  // Append X axis with labels
  this.svg.append('g')
    .attr('transform', `translate(0,${this.height})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('transform', 'translate(-10,0)rotate(-45)')
    .style('text-anchor', 'end');

  // Append Y axis with labels
  this.svg.append('g')
    .call(d3.axisLeft(y));

  // Append bars
  this.svg.selectAll('rect')
    .data(data)
    .enter()
    .append('rect')
    .attr('x', (d: any) => x(d.Framework || '') || 0)
    .attr('y', (d: any) => y(parseFloat(d.Stars)) || 0)
    .attr('width', x.bandwidth())
    .attr('height', (d: any) => this.height - (y(parseFloat(d.Stars)) || 0))
    .attr('fill', '#d04a35');

  // Append labels on bars
  this.svg.selectAll('text.bar-label')
    .data(data)
    .enter()
    .append('text')
    .attr('class', 'bar-label')
    .attr('x', (d: any) => (x(d.Framework || '') || 0) + x.bandwidth() / 2)
    .attr('y', (d: any) => (y(parseFloat(d.Stars)) || 0) - 5)  // Position above the bar
    .attr('text-anchor', 'middle')
    .text((d: any) => d.Stars ? d.Stars.toString() : 'N/A');  // Ensure the label is a string
  }
  //////////////////////////////////////////
  private createLineChart(index: number): void {
    const containerId = `line-chart-${index}`;
    this.createSvg(containerId);
    this.drawLineChart(this.columnData);
  }
  private drawLineChart(data: { Framework: string, Stars: number }[]): void {
  if (!data || data.length === 0) return;

  // Ensure data values are numbers
  data.forEach(d => d.Stars = +d.Stars);

  // Define x and y scales
  const x = d3.scaleBand<string>()
    .domain(data.map(d => d.Framework))
    .range([0, this.width])
    .padding(0.2);

  const y = d3.scaleLinear<number>()
    .domain([0, d3.max(data, d => d.Stars) || 0])
    .range([this.height, 0]);

  // Define the line generator
  const line = d3.line<{ Framework: string, Stars: number }>()
    .x(d => x(d.Framework) || 0)
    .y(d => y(d.Stars) || 0);

  // Create the line path
  this.svg.selectAll(".line")
    .data([data])
    .enter()
    .append("path")
    .attr("class", "line")
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    .attr("d", line as any); // Cast to any here

  // Add x-axis
  this.svg.append("g")
    .attr("transform", `translate(0,${this.height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("text-anchor", "end");

  // Add y-axis
  this.svg.append("g")
    .call(d3.axisLeft(y));

  // Add tooltips or labels
  this.svg.selectAll(".dot")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "dot")
    .attr("cx", (d: { Framework: string, Stars: number }) => x(d.Framework) || 0)
    .attr("cy", (d: { Stars: number }) => y(d.Stars) || 0)
    .attr("r", 5)
    .style("fill", "red")
    .append("title")
    .text((d: { Framework: string, Stars: number }) => `${d.Framework}: ${d.Stars}`);
}
  //////////////////////////////////////////
  private createMultiSeriesLineChart(index: number): void {
    const containerId = `line-chart-${index}`;
    this.createSvg(containerId);
    this.drawMultiLineChart(this.columnData);
  }  
 private drawMultiLineChart(data: { Framework: number, Stars: number }[]): void {
  if (!data || data.length === 0) return;

  // Ensure data values are numbers
  data.forEach(d => {
    d.Framework = +d.Framework;
    d.Stars = +d.Stars;
  });

  // Define x and y scales
  const x = d3.scaleLinear<number>()
    .domain([0, d3.max(data, d => d.Stars) || 0])
    .range([0, this.width]);

  const yLeft = d3.scaleLinear<number>()
    .domain([0, d3.max(data, d => d.Framework) || 0])
    .range([this.height, 0]);

  const yRight = d3.scaleLinear<number>()
    .domain([0, d3.max(data, d => d.Stars) || 0])
    .range([this.height, 0]);

  // Define line generators for each metric
  const lineStars = d3.line<{ Framework: number, Stars: number }>()
    .x(d => x(d.Stars)) // x represents Stars
    .y(d => yLeft(d.Framework)); // y represents Framework on the left axis

  const lineFramework = d3.line<{ Framework: number, Stars: number }>()
    .x(d => x(d.Framework)) // x represents Framework on the x-axis
    .y(d => yRight(d.Stars)); // y represents Stars on the right axis

  // Clear previous chart elements
  this.svg.selectAll("*").remove();

  // Create lines for Stars and Framework
  this.svg.append("path")
    .datum(data)
    .attr("class", "line-stars")
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    .attr("d", lineStars as any); // Cast to any

  this.svg.append("path")
    .datum(data)
    .attr("class", "line-framework")
    .attr("fill", "none")
    .attr("stroke", "orange")
    .attr("stroke-width", 1.5)
    .attr("d", lineFramework as any); // Cast to any

  // Add x-axis
  this.svg.append("g")
    .attr("transform", `translate(0,${this.height})`)
    .call(d3.axisBottom(x));

  // Add left y-axis for Framework
  this.svg.append("g")
    .call(d3.axisLeft(yLeft))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -10)
    .attr("x", -this.height / 2)
    .attr("text-anchor", "middle")
    .text("Framework"); // Label showing Framework

  // Add right y-axis for Stars
  this.svg.append("g")
    .attr("transform", `translate(${this.width}, 0)`)
    .call(d3.axisRight(yRight))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -10)
    .attr("x", this.height / 2)
    .attr("text-anchor", "middle")
    .text("Stars"); // Label showing Stars

  // Add tooltips or labels for Stars
  this.svg.selectAll(".dot-stars")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "dot-stars")
    .attr("cx", (d: { Stars: number }) => x(d.Stars)) // Use x for Stars
    .attr("cy", (d: { Framework: number }) => yLeft(d.Framework)) // Use y for Framework
    .attr("r", 5)
    .style("fill", "steelblue")
    .append("title")
    .text((d: { Framework: number, Stars: number }) => `Framework: ${d.Framework}, Stars: ${d.Stars}`);

  // Add tooltips or labels for Framework
  this.svg.selectAll(".dot-framework")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "dot-framework")
    .attr("cx", (d: { Framework: number }) => x(d.Framework)) // Use x for Framework
    .attr("cy", (d: { Stars: number }) => yRight(d.Stars)) // Use y for Stars
    .attr("r", 5)
    .style("fill", "orange")
    .append("title")
    .text((d: { Framework: number, Stars: number }) => `Framework: ${d.Framework}, Stars: ${d.Stars}`);
}  
  //////////////////////////////////////////
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
  //////////////////////////////////////////
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
  //////////////////////////////////////////
  private createPieChart(index: number): void {
    const containerId = `pie_chart-${index}`;
    this.create_Svg(containerId);
    this.drawPieChart(this.columnData);
  }
  private drawPieChart(data: any[]): void {
    if (!data || data.length === 0) return;
  
    const radius = Math.min(this.width, this.height) / 2;
  
    const color = d3.scaleOrdinal<string>()
      .domain(data.map(d => d.Framework))
      .range(d3.schemeCategory10);
  
    const pie = d3.pie<any>()
      .value((d: any) => d.Stars)
      .sort(null);
  
    const arc = d3.arc<d3.PieArcDatum<any>>()
      .innerRadius(0) // No inner radius for pie chart
      .outerRadius(radius);
  
    const labelArc = d3.arc<d3.PieArcDatum<any>>()
      .innerRadius(radius * 0.6) // Adjust label position if needed
      .outerRadius(radius);
  
    // Remove old arcs and text that are no longer present
    this.svg.selectAll(".arc").remove();
  
    const arcs = this.svg.selectAll(".arc")
      .data(pie(data))
      .enter().append("g")
      .attr("class", "arc");
  
    arcs.append("path")
      .attr("d", arc)
      .attr("fill", (d: d3.PieArcDatum<any>) => color(d.data.Framework))
      .attr("stroke", "#fff")
      .style("stroke-width", "2px")
      .style("opacity", 0.8)
      .transition()
      .duration(750)
      .attrTween("d", (d: d3.PieArcDatum<any>) => {
        const i = d3.interpolate(d, d);
        return (t: number) => arc(i(t));
      });
  
    // Create a tooltip element
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("padding", "8px")
      .style("background", "#fff")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("opacity", 0);
  
    // Add hover effects with tooltips
    arcs.on("mouseover", (event: MouseEvent, d: d3.PieArcDatum<any>) => {
      if (event.currentTarget) {
        d3.select(event.currentTarget as SVGElement).select("path")
          .transition().duration(200)
          .style("opacity", 1)
          .style("stroke-width", "3px");
  
        tooltip.transition().duration(200).style("opacity", .9);
        tooltip.html(`${d.data.Framework}: ${d.data.Stars}`)
          .style("left", `${event.pageX + 5}px`)
          .style("top", `${event.pageY - 28}px`);
      }
    }).on("mouseout", (event: MouseEvent) => {
      if (event.currentTarget) {
        d3.select(event.currentTarget as SVGElement).select("path")
          .transition().duration(200)
          .style("opacity", 0.8)
          .style("stroke-width", "2px");
  
        tooltip.transition().duration(200).style("opacity", 0);
      }
    });
  } 
  //////////////////////////////////////////
  private createDonutChart(index: number): void {
    const containerId = `donut_chart-${index}`;
    this.create_Svg(containerId);
    this.drawDonutChart(this.columnData);
  }
  private drawDonutChart(data: any[]): void {
    if (!data || data.length === 0) return;
  
    const radius = Math.min(this.width, this.height) / 2;
    const innerRadius = radius / 2;
  
    const color = d3.scaleOrdinal<string>()
      .domain(data.map(d => d.Framework))
      .range(d3.schemeCategory10);
  
    const pie = d3.pie<any>()
      .value((d: any) => d.Stars)
      .sort(null);
  
    const arc = d3.arc<d3.PieArcDatum<any>>()
      .innerRadius(innerRadius)
      .outerRadius(radius);
  
    // Bind the data to the arcs
    const arcs = this.svg.selectAll(".arc")
      .data(pie(data));
  
    // Remove old arcs and text that are no longer present
    arcs.exit().remove();
  
    // Enter new arcs
    const newArcs = arcs.enter().append("g")
      .attr("class", "arc");
  
    newArcs.append("path")
      .attr("d", arc)
      .attr("fill", (d: d3.PieArcDatum<any>) => color(d.data.Framework))
      .attr("stroke", "black")
      .style("stroke-width", "1px")
      .style("opacity", 0.9)
      .transition()
      .duration(750)
      .attrTween("d", (d: d3.PieArcDatum<any>) => {
        const i = d3.interpolate(d, d);
        return (t: number) => arc(i(t));
      });
  
    // Remove any existing text elements before adding new ones
    this.svg.selectAll(".arc text").remove();
  
    // Create a tooltip element
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("padding", "8px")
      .style("background", "#fff")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("opacity", 0);
  
    // Add hover effects with tooltips
    newArcs.on("mouseover", (event: MouseEvent, d: d3.PieArcDatum<any>) => {
      if (event.currentTarget) {
        d3.select(event.currentTarget as SVGElement).select("path")
          .transition().duration(200)
          .style("opacity", 1)
          .style("stroke-width", "2px");
  
        tooltip.transition().duration(200).style("opacity", .9);
        tooltip.html(`${d.data.Framework}: ${d.data.Stars}`)
          .style("left", `${event.pageX + 5}px`)
          .style("top", `${event.pageY - 28}px`);
      }
    }).on("mouseout", (event: MouseEvent) => {
      if (event.currentTarget) {
        d3.select(event.currentTarget as SVGElement).select("path")
          .transition().duration(200)
          .style("opacity", 0.9)
          .style("stroke-width", "1px");
  
        tooltip.transition().duration(200).style("opacity", 0);
      }
    });
  }
  
}
