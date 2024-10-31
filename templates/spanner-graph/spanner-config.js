class GraphConfig {

    /**
     * The array of node objects to be rendered.
     * @type {Array<Node>}
     */
    nodes = [];

    /**
     * The array of edge objects to be rendered.
     * @type {Array<Edge>}
     */
    edges = [];

    /**
     * Raw data of rows from Spanner Graph
     * @type {Array<Any>}
     */
    rowsData = [];

    /**
     * The currently focused GraphObject. This is usually the
     * node or edge that the user is hovering their mouse over.
     * @type {GraphObject}
     * @default null
     */
    focusedGraphObject = null;

    /**
     * The currently selected GraphObject. This is usually
     * the node or edge that the user has clicked on.
     * @type {GraphObject}
     * @default null
     */
    selectedGraphObject = null;

    /**
     * The color scheme to use for nodes.
     * @type {GraphConfig.ColorScheme}
     * @default GraphConfig.ColorScheme.NEIGHBORHOOD
     */
    colorScheme = GraphConfig.ColorScheme.NEIGHBORHOOD;

    colorPalette = [
        '#1A73E8', '#E52592', '#12A4AF', '#F4511E',
        '#9334E6', '#689F38', '#3949AB', '#546E7A',
        '#EF6C00', '#D93025', '#1E8E3E', '#039BE5'
    ];

    // [label: string]: colorString
    nodeColors = {};

    edgeDesign = {
        default: {
            color: '#DADCE0',
            width: 2,
            shadowWidth: 0,
            shadowColor: '#000000'
        },
        focused: {
            color: '#80868B',
            width: 4,
            shadowWidth: 6,
            shadowColor: '#E8EAED'
        },
        selected: {
            color: '#1A73E8',
            width: 4,
            shadowWidth: 8,
            shadowColor: 'rgba(26, 115, 232, 0.25)'
        }
    };

    static ColorScheme = Object.freeze({
        NEIGHBORHOOD: Symbol('neighborhood'),
        LABEL: Symbol('label')
    });

    /**
     * Constructs a new GraphConfig instance.
     * @constructor
     * @param {Object} config - The configuration object.
     * @param {Array} config.nodesData - An array of data objects for nodes.
     * @param {Array} config.edgesData - An array of data objects for edges.
     * @param {Array} [config.colorPalette] - An optional array of colors to use as the color palette.
     * @param {GraphConfig.ColorScheme} [config.colorScheme] - Color scheme can be optionally declared.
     * @param {Array} [config.rowsData] - Raw row data from Spanner
     */
    constructor({ nodesData, edgesData, colorPalette, colorScheme, rowsData }) {
        this.nodes = this.parseNodes(nodesData);
        this.edges = this.parseEdges(edgesData);

        if (colorPalette && Array.isArray(colorPalette)) {
            this.colorPalette = colorPalette;
        }

        if (colorScheme) {
            this.colorScheme = colorScheme;
        }

        this.rowsData = rowsData;

        this.assignColors(this.nodes);
    }

    assignColors(nodes) {
        if (!nodes || !nodes instanceof Array) {
            console.error('Nodes must be array', nodes);
            throw Error('Nodes must be an array');
        }

        nodes.forEach(node => {
            if (this.colorPalette.length === 0) {
                console.error('Node labels exceed the color palette. Assigning default color.');
                return;
            }

            if (!node || !node instanceof Node) {
                console.error('Object is not an instance of Node', node);
                return;
            }

            const label = node.label;
            if (!label || !label instanceof String) {
                console.error('Node does not have a label', node);
                return;
            }

            if (!this.nodeColors[label]) {
                this.nodeColors[label] = this.colorPalette.shift();
            }
        });
    }

    /**
     * Parses an array of node data, instantiates nodes, and adds them to the graph.
     * @param {Array} nodesData - An array of objects representing the data for each node.
     * @throws {Error} Throws an error if `nodesData` is not an array.
     */
    parseNodes(nodesData) {
        if (!Array.isArray(nodesData)) {
            console.error('Nodes must be an array', nodesData)
            throw Error('Nodes must be an array');
        }

        /** @type {Node[]} */
        const nodes = []
        nodesData.forEach(nodeData => {
            if (!(nodeData instanceof Object)) {
                console.error('Node data is not an object', nodeData);
                return;
            }

            // Try to create a Node
            const node = new Node(nodeData);
            if (!node || !node.instantiated) {
                console.error('Unable to instantiate node', node.instantiationErrorReason);
                return;
            }
            if (node instanceof Node) {
                nodes.push(node);
            } else {
                node.instantiationErrorReason = 'Could not construct an instance of Node';
                console.error(node.instantiationErrorReason, { nodeData, node });
                return;
            }
        });

        return nodes;
    }

    parseEdges(edgesData) {
        if (!Array.isArray(edgesData)) {
            console.error('Edges must be an array', edgesData)
            throw Error('Edges must be an array');
        }

        /** @type {Edge[]} */
        const edges = []
        edgesData.forEach(edgeData => {
            if (!(edgeData instanceof Object)) {
                console.error('Edge data is not an object', edgeData);
                return;
            }

            // Try to create an Edge
            const edge = new Edge(edgeData);
            if (!edge || !edge.instantiated) {
                console.error('Unable to instantiate edge', edge.instantiationErrorReason);
                return;
            }
            if (edge instanceof Edge) {
                edges.push(edge);
            } else {
                edge.instantiationErrorReason = 'Could not construct an instance of Edge';
                console.error(edge.instantiationErrorReason, { edgeData, edge });
                return;
            }
        });

        return edges;
    }
}

window[namespace].GraphConfig = GraphConfig;