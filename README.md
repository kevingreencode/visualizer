# Network Topology Visualizer

A powerful web-based tool for visualizing and interacting with network topology files. This visualizer automatically detects and renders different types of network topologies, including Fat Trees, Binary Trees, and more.

![Network Topology Visualizer](https://raw.githubusercontent.com/kevingreencode/visualizer/refs/heads/main/sample.png)

## Features

- **Automatic Topology Detection**: Intelligently identifies topology types (Fat Tree, Binary Tree, Linear, etc.)
- **Multiple Layout Algorithms**: Optimized visualization for different network architectures
- **Interactive Interface**: Drag, zoom, and click nodes to inspect network elements
- **Bandwidth Visualization**: Shows bandwidth information on links when available
- **Grid System**: Snap-to-grid functionality for clean, organized layouts
- **Customizable View**: Toggle labels, grid lines, and adjust display settings
- **Detailed Information**: View comprehensive node configuration and connection details
- **Port Information**: Shows connection port numbers for each link

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/kevingreencode/visualizer.git
   ```

2. Navigate to the project directory:
   ```
   cd visualizer
   ```

3. Open `index.html` in your preferred web browser:
   ```
   firefox index.html
   # or
   chrome index.html
   # or any other browser
   ```

No server-side components or build steps required - this is a pure HTML/CSS/JavaScript application.

## Usage

### Loading a Topology

1. Click the "Upload Topology File" button
2. Select a JSON topology file
3. The system will automatically detect the topology type and display it using the most appropriate layout

### Interacting with the Visualization

- **Pan**: Click and drag on empty space
- **Zoom**: Use mouse wheel or trackpad gestures
- **Move Nodes**: Drag individual nodes to reposition them
- **View Details**: Click on any node to see its configuration and connections
- **Reset View**: Click "Reset View" to restore the original visualization

### Customizing the Display

- **Toggle Labels**: Show/hide node and bandwidth labels
- **Toggle Grid**: Show/hide the background grid
- **Change Layout**: Select a different algorithm from the layout dropdown
- **Adjust Grid Size**: Use the slider to change grid granularity
- **Snap to Grid**: Toggle grid snapping for precise alignment

## Supported Topology Types

### Fat Tree
Optimized for hierarchical datacenter topologies with core, aggregate, and top-of-rack (ToR) layers.
```json
{
  "topology": {
    "links": [["c1", "a1"], ["a1", "t1"], ["t1", "h1"]],
    "hosts": { "h1": {} },
    "switches": { "c1": {}, "a1": {}, "t1": {} }
  }
}
```

### Binary Tree
Visualizes binary tree topologies with multiple levels (a, b, c, d) connected in a tree structure.
```json
{
  "topology": {
    "links": [["a1", "b1"], ["a1", "b2"], ["b1", "c1"], ["b1", "c2"]],
    "hosts": { "h1": {} },
    "switches": { "a1": {}, "b1": {}, "b2": {}, "c1": {}, "c2": {} }
  }
}
```

### Linear
Displays simple topologies with linear connections between switches and hosts.
```json
{
  "topology": {
    "links": [["h1", "s1"], ["s1", "s2"], ["s2", "h2"]],
    "hosts": { "h1": {}, "h2": {} },
    "switches": { "s1": {}, "s2": {} }
  }
}
```

### Force-Directed
A fallback layout for custom or complex topologies that don't match standard patterns.

## Configuration Options

### Grid Settings

- **Grid Size**: Controls the spacing between grid lines (20px-100px)
- **Snap to Grid**: When enabled, nodes will align to the nearest grid intersection

### Layout Selector

- **Auto Detect**: Automatically selects the best layout based on topology structure
- **Fat Tree**: Forces the fat tree layout algorithm
- **Binary Tree**: Forces the binary tree layout algorithm
- **Linear**: Forces the linear layout algorithm
- **Force-Directed**: Uses a physics-based layout for custom topologies

## Node Types and Colors

- **Host (h)**: Green
- **ToR/Edge Switch (t)**: Blue
- **Aggregate Switch (a)**: Orange
- **Core Switch (c)**: Red
- **Generic Switch (s)**: Gray

## Technical Implementation

### Architecture Overview

The visualizer is built using a modular architecture with the following core components:

- **Parser Module**: Reads and validates JSON topology files
- **Detection Engine**: Analyzes topology structure and assigns layout algorithms
- **Layout Engine**: Implements multiple layout algorithms for different topology types
- **Rendering Engine**: Handles SVG-based visualization using D3.js
- **Interaction System**: Manages user inputs (drag, zoom, click) and updates

### Core Technologies

- **D3.js v7**: For data-driven DOM manipulation and SVG rendering
- **CSS3**: For styling and transitions
- **Vanilla JavaScript**: For application logic and topology processing
- **SVG**: For scalable vector graphics and network visualization

### Technology Choice Rationale

#### Why D3.js?

1. **Data-Driven Approach**: D3's data binding pattern allows us to efficiently map topology data to visual elements
2. **Force Simulation**: Built-in physics engine for natural node positioning and animations
3. **DOM Manipulation**: Efficient enter/update/exit pattern for managing dynamic network elements
4. **Event Handling**: Powerful event system for interactive features like dragging and zooming
5. **Ecosystem**: Rich ecosystem of plugins and examples for network visualization

#### Why SVG?

1. **Scalability**: SVG graphics scale without loss of quality at any zoom level
2. **DOM Integration**: Each node and link can be individually styled and manipulated
3. **Performance**: Hardware acceleration for smooth animations and interactions
4. **Flexibility**: Custom shapes and icons can be defined programmatically
5. **Accessibility**: SVG elements can include semantic information for screen readers

### System Architecture Deep Dive

#### 1. Data Flow

```javascript
// 1. Topology Loading
handleFileUpload() → loadTopology() → buildGraph()

// 2. Layout Calculation
applyFatTreeLayout() / applyBinaryTreeLayout() / etc.

// 3. Rendering
visualizeGraph() → SVG Updates

// 4. User Interaction
dragstarted() → dragged() → dragended()
```

#### 2. Key Function Overview

**`loadTopology(data)`**
- Extracts topology data from uploaded JSON
- Initiates automatic layout detection
- Triggers UI updates and visualization

**`buildGraph(topology)`**
- Transforms raw topology data into node and link objects
- Assigns port numbers based on link order
- Creates data structures for D3 visualization

**`visualizeGraph(graph)`**
- Core rendering function using D3's data binding
- Creates SVG elements for nodes and links
- Sets up force simulation and interaction handlers
- Manages the enter/update/exit pattern for dynamic updates

**`detectTopologyType(graph, topology)`**
- Analyzes node naming patterns and structure
- Uses priority-based algorithm to classify topology type
- Returns appropriate layout strategy

**Force Simulation Functions**
```javascript
d3.forceSimulation(graph.nodes)
    .force('link', d3.forceLink(graph.links))     // Spring forces between connected nodes
    .force('charge', d3.forceManyBody())          // Repulsion forces
    .force('x', d3.forceX())                      // Horizontal positioning
    .force('y', d3.forceY())                      // Vertical positioning
```

#### 3. Rendering Pipeline

1. **SVG Initialization**: Create base SVG container with zoom behavior
   ```javascript
   svg = d3.select('#graph-container')
       .append('svg')
       .call(d3.zoom().on('zoom', handleZoom));
   ```

2. **Data Binding**: Link data to DOM elements
   ```javascript
   const nodeGroup = svg.selectAll('.node-group')
       .data(graph.nodes)
       .enter()
       .append('g');
   ```

3. **Visual Element Creation**: Add shapes and paths
   ```javascript
   // Add icon backgrounds
   nodeGroup.append('circle')
       .attr('r', 14)
       .attr('fill', getNodeColor);
   
   // Add custom icons
   nodeGroup.append('path')
       .attr('d', getIconPath)
       .attr('fill', '#ffffff');
   ```

4. **Animation Loop**: Update positions every frame
   ```javascript
   simulation.on('tick', () => {
       nodes.attr('transform', d => `translate(${d.x},${d.y})`);
       links.attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y);
   });
   ```

### Key Algorithms

#### 1. Topology Detection Algorithm

```javascript
function detectTopologyType(graph, topology) {
    // Priority-based detection
    if (prefixCounts['b']) return 'binary';  // Binary trees have unique 'b' prefix
    if (hasFatTreeStructure()) return 'fattree';  // Core/Aggregate/ToR structure
    if (isLinearTopology()) return 'linear';  // Simple linear connections
    return 'force';  // Fallback to force-directed
}
```

#### 2. Layout Algorithms

**Fat Tree Layout**:
- Calculates horizontal layers for core, aggregate, and ToR switches
- Uses mathematical spacing to organize nodes in strict linear patterns
- Groups hosts under their connected ToR switches

**Binary Tree Layout**:
- Extracts hierarchy levels based on node naming conventions (a, b, c, d)
- Organizes levels vertically with mathematical spacing
- Positions nodes horizontally within each level

**Force-Directed Layout**:
- Uses D3's force simulation with multiple forces (link, charge, center)
- Applies spring and repulsion forces for natural positioning
- Allows dynamic adjustment based on network density

#### 3. Icon Rendering System

```javascript
// SVG Icon Definitions
const svgIcons = {
    host: {
        path: 'M2,2 v16 h20 v-16 z...',  // Server/computer shape
        viewBox: '0 0 24 24',
        size: 24
    },
    switch: {
        path: 'M2,6 v12 h20 v-12 z...',  // Network switch shape
        viewBox: '0 0 24 24',
        size: 24
    }
};
```

### Data Structures

#### Node Object
```javascript
{
    id: "s1",
    type: "switch",  // host, tor, aggregate, core, switch
    config: {},      // Custom configuration from topology
    ports: {},       // Port number assignments
    x, y: number,    // Current position
    layoutX, layoutY: number  // Calculated layout position
}
```

#### Link Object
```javascript
{
    source: "s1",
    target: "s2",
    sourcePort: 1,   // Source port number
    targetPort: 1,   // Target port number
    properties: {    // Link properties (bandwidth, etc.)
        bw: 4
    }
}
```

### Port Assignment System

The visualizer implements a sequential port assignment system:

1. Ports are numbered starting from 1
2. Port numbers are assigned based on the order links appear in the JSON
3. Each node maintains a port counter that increments for each connection
4. Port information is displayed in the node details panel

```javascript
// Port assignment during graph building
const nodePortCounters = {};
topology.links.forEach(link => {
    const sourcePort = nodePortCounters[sourceId]++;
    const targetPort = nodePortCounters[targetId]++;
    // Store in link and node objects
});
```

### Grid and Snapping System

- Implements a customizable grid overlay
- Supports snap-to-grid functionality for precise node positioning
- Grid size is adjustable from 20px to 100px
- Snapping occurs during drag operations and layout calculations

```javascript
// Grid snapping during drag
function dragged(event, d) {
    if (snapToGrid) {
        d.fx = Math.round(event.x / gridSize) * gridSize;
        d.fy = Math.round(event.y / gridSize) * gridSize;
    }
}
```

### Performance Optimizations

- **Efficient DOM Updates**: Uses D3's enter/update/exit pattern
- **Event Delegation**: Minimizes event listener overhead
- **Simulation Optimization**: Configurable alpha decay for faster settling
- **Selective Redrawing**: Only updates changed elements during interactions

### State Management

The application maintains global state for:
- Current topology data
- Selected layout type
- UI settings (labels, grid, snap-to-grid)
- Node positions and force simulation parameters

### Extensibility

The modular design allows for easy extension:
- New layout algorithms can be added to the layout engine
- Custom node types and icons can be defined in the SVG definitions
- Additional topology detection patterns can be added to the detection engine
- New interaction modes can be integrated through the event system

## Project Structure

- `index.html` - Main HTML file
- `styles.css` - CSS styling
- `script.js` - JavaScript code for the visualizer
- `examples/` - Sample topology files

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [D3.js](https://d3js.org/) for visualization
- Inspired by the need for better network topology visualization tools for CS145 projects.