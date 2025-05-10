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

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/network-topology-visualizer.git
   ```

2. Navigate to the project directory:
   ```
   cd network-topology-visualizer
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
- Inspired by the need for better network topology visualization tools in SDN research