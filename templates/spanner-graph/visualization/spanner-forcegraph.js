class GraphVisualization {
    /**
     * The graph store that this visualization is based on.
     * @type {GraphStore}
     */
    store;

    /**
     * The DOM element that the graph will be rendered in.
     * @type {HTMLElement}
     */
    mount;

    /**
     * The DOM element that the menu will be rendered in.
     * @type {HTMLElement}
     */
    menuMount;

    /**
     * The ForceGraph object that renders the graph.
     * @type {ForceGraph}
     */
    graph;

    /**
     * The Node that the user has clicked on. It will be visually highlighted.
     * @type {?Node}
     */
    selectedNode = null;

    /**
     * The Edge that the user has clicked on. It will be visually highlighted.
     * @type {?Edge}
     */
    selectedEdge = null;


    /**
     * The Nodes that are connected to the selected edge. It will be visually highlighted.
     * @type {Node[]}
     */
    selectedEdgeNeighbors = [];

    /**
     * The Nodes that are connected to the focused edge. It will be visually highlighted.
     * @type {Node[]}
     */
    focusedEdgeNeighbors = [];

    /**
     * All of the edges connected to the selected node. They will be visually highlighted.
     * @type {Array<Edge>}
     */
    selectedNodeEdges = [];

    /**
     * Neighboring Nodes to the selected Node. They will be visually highlighted, but not as prominently as the selected node.
     * @type {Array<Node>}
     */
    selectedNodeNeighbors = [];

    /**
     * The Node that the user is hovering their mouse over. It will be visually highlighted.
     * @type {?Node}
     */
    focusedNode = null;

    /**
     * All of the edges connected to the focused node. They will be visually highlighted.
     * @type {Array<Edge>}
     */
    focusedNodeEdges = [];

    /**
     * Neighboring Nodes to the focused Node. They will be visually highlighted, but not as prominently as the focused node.
     * @type {Array<Node>}
     */
    focusedNodeNeighbors = [];

    /**
     * @typedef {{ [key: GraphObject]: HTMLElement }} Tooltips
     */
    /** @type {Tooltips} */
    tooltips = {};

    // The graph will only automatically center upon
    // the initial layout has finished.
    initialCenteringHasHappenned = false;


    /**
     * @typedef {Object} ToolsConfig
     * @property {number} zoomInSpeed - Speed of zooming in.
     * @property {number} zoomInIncrement - Increment value for zooming in.
     * @property {number} zoomOutIncrement - Increment value for zooming out.
     * @property {number} zoomOutSpeed - Speed of zooming out.
     * @property {number} recenterSpeed - Speed of recentering.
     */
    /**
     * @typedef {Object} ToolsElements
     * @property {HTMLElement|null} container - The container element.
     * @property {HTMLElement|null} recenter - The recenter button element.
     * @property {HTMLElement|null} zoomIn - The zoom in button element.
     * @property {HTMLElement|null} zoomOut - The zoom out button element.
     */
    /**
     * @typedef {Object} Tools
     * @property {ToolsElements} elements - The HTML elements used by the tools.
     * @property {ToolsConfig} config - Configuration for the tools.
     */
    /** @type {Tools} */
    tools = {
        elements: {
            container: null,
            recenter: null,
            zoomIn: null,
            zoomOut: null
        },
        config: {
            zoomInSpeed: 100,
            zoomInIncrement: 2,
            zoomOutIncrement: 0.5,
            zoomOutSpeed: 100,
            recenterSpeed: 200
        }
    };

    static ClusterMethod = Object.freeze({
        NEIGHBORHOOD: Symbol('Force directed in community'),
        LABEL: Symbol('Force directed')
    });

    /**
     * @typedef {Object} MenuConfig
     * @property {ClusterMethod} clusterBy - Speed of zooming in.
     */
    /**
     * @typedef {Object} MenuElements
     * @property {HTMLElement|null} cluster - The element that toggles cluster method
     */
    /**
     * @typedef {Object} Menu
     * @property {ToolsElements} elements - The HTML elements used by the tools.
     * @property {ToolsConfig} config - Configuration for the tools.
     */
    /** @type {Menu} */
    menu = {
        elements: {
            cluster: null
        },
        config: {
            clusterBy: GraphVisualization.ClusterMethod.NEIGHBORHOOD
        },
        layout: {
            lastLayout: null,
            currentLayout: null
        }
    };

    // key is the amount of nodes in the ground
    static GraphSizes = Object.freeze({
        SMALL: Symbol('Small'),
        MEDIUM: Symbol('Medium'),
        LARGE: Symbol('Large'),
        UNDEFINED: Symbol('Large'),
    });

    getGraphSize() {
        if (!this.store) {
            console.error('getGraphSize: Store is not defined');
            return GraphVisualization.GraphSizes.UNDEFINED;
        }

        const { nodes } = this.store.config;

        if (nodes.length < 100) {
            return GraphVisualization.GraphSizes.SMALL;
        }

        if (nodes.length < 500) {
            return GraphVisualization.GraphSizes.MEDIUM;
        }

        return GraphVisualization.GraphSizes.LARGE;
    }

    getNodeRelativeSize() {
        return this.NODE_REL_SIZE;
    }

    nodeCanvasObjectFunctions = []

    NODE_REL_SIZE = 4;

    EDGE_DEFAULT_WIDTH = 2;
    EDGE_MAX_COUNT_SHOW_LABEL = 100;
    EDGE_PARTICLE_DEFAULT_COUNT = 0;
    EDGE_PARTICLE_DEFAULT_WIDTH = 0;

    /**
     * Renders a graph visualization.
     * @param {GraphStore} - The store to derive configuration from.
     * @param HTMLElement - The DOM element that the graph will be rendered in.
     * @param HTMLElement - The DOM element that the top menu will be rendered in.
     */
    constructor(inStore, inMount, inMenuMount) {
        if (!(inStore instanceof GraphStore)) {
            throw Error('Store must be an instance of GraphStore', inStore);
        }

        if (!(inMount instanceof HTMLElement)) {
            throw Error('Mount must be an instance of HTMLElement', inMount);
        }

        if (!(inMenuMount instanceof HTMLElement)) {
            throw Error('Menu Mount must be an instance of HTMLElement', inMenuMount);
        }

        this.store = inStore;
        this.mount = inMount;
        this.menuMount = inMenuMount;

        // tooltips are absolutely positioned
        // relative to the mounting element
        this.mount.style.display = 'relative';

        this.initializeEvents(this.store);
        this.graph = ForceGraph()(this.mount);
        this._setupGraphTools(this.graph);
        this._setupMenu(this.graph);
        this._setupDrawLabelsOnEdges(this.graph);
        this._setupLineLength(this.graph);
        this._setupDrawNodes(this.graph);
        this._setupDrawEdges(this.graph);

        this.graph.dagMode('');

        this.render(this.store.config);
    }

    sanitize(input) {
        if (input === null || input === undefined) return '';
        const str = String(input)
        return str.replace(/[&<>"'`=\/]/g, function (s) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
                '`': '&#96;',
                '=': '&#61;',
                '/': '&#47;'
            }[s];
        });
    }

    /**
     * Registers callbacks for GraphStore events.
     * @param {GraphStore} store
     */
    initializeEvents(store) {
        if (!(store instanceof GraphStore)) {
            throw Error('Store must be an instance of GraphStore', store);
        }

        store.addEventListener(GraphStore.EventTypes.CONFIG_CHANGE,
            (config) => this.onStoreConfigChange(config));

        store.addEventListener(GraphStore.EventTypes.FOCUS_OBJECT,
            (graphObject, config) => {
                this.focusedNode = null;
                this.focusedNodeEdges = [];
                this.focusedNodeNeighbors = []
                this.focusedEdge = null;
                this.focusedEdgeNodes = [];

                if (graphObject instanceof Node) {
                    this.onFocusedNodeChanged(graphObject)
                }

                if (graphObject instanceof Edge) {
                    this.onFocusedEdgeChanged(graphObject)
                }
            });

        store.addEventListener(GraphStore.EventTypes.SELECT_OBJECT,
            (graphObject, config) => {
                this.selectedNode = null;
                this.selectedEdge = null;
                this.selectedNodeEdges = [];
                this.selectedNodeNeighbors = [];
                this.selectedEdgeNeighbors = [];

                if (graphObject instanceof Node && graphObject) {
                    this.onSelectedNodeChanged(graphObject);
                }

                if (graphObject instanceof Edge && graphObject) {
                    this.onSelectedEdgeChanged(graphObject);
                }

                if (!this.menu.config.showLabels) {
                    this.refreshTooltips([graphObject]);
                }
            });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.store.setSelectedObject(null); // Deselect any selected node/edge
            }
        });
    }

    refreshTooltips(graphObjects) {
        Object.keys(this.tooltips).forEach(key => {
            this.tooltips[key].parentNode.removeChild(this.tooltips[key]);
            delete this.tooltips[key];
        });

        if (graphObjects.length == 0) {
            return;
        }

        if (this.store.config.selectedGraphObject instanceof Edge) {
            // If an edge is selected, only create tooltips for source and target
            const edge = this.store.config.selectedGraphObject;
            this.tooltips[edge.source.id] = this.createTooltip(edge.source);
            this.tooltips[edge.target.id] = this.createTooltip(edge.target);
        } else if (this.store.config.selectedGraphObject instanceof Node) {
            graphObjects.forEach(graphObject => {
                if (!graphObject || this.tooltips[graphObject.id]) {
                    return;
                }
                this.tooltips[graphObject.id] = this.createTooltip(graphObject); 

                if (this.store.config.selectedGraphObject instanceof Node) { 
                    this.store.getNeighborsOfObject(graphObject).forEach(neighbor => {
                        if (!neighbor || this.tooltips[neighbor.id]) {
                            return;
                        }
                        this.tooltips[neighbor.id] = this.createTooltip(neighbor);
                    });

                    this.store.getEdgesOfObject(graphObject).forEach(edge => {
                        if (!edge || this.tooltips[edge.id]) {
                            return;
                        }
                        this.tooltips[edge.id] = this.createTooltip(edge);
                    });
                }
            });
        }
    }

    _setupGraphTools(graphObject) {
        const html = `
            <button id="graph-zoom-in" title="Zoom In" fill="#3C4043">
                <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="#3C4043">
                    <path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Zm-40-60v-80h-80v-80h80v-80h80v80h80v80h-80v80h-80Z"/>
                </svg>
            </button>
            <button id="graph-zoom-out" title="Zoom Out" fill="#3C4043">
                <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="#3C4043">
                    <path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400ZM280-540v-80h200v80H280Z"/>
                </svg>
            </button>
            <button id="graph-recenter" title="Recenter Graph" class="recenter-button" fill="#3C4043">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3C4043">
                    <path d="M480-320q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm0-80q33 0 56.5-23.5T560-480q0-33-23.5-56.5T480-560q-33 0-56.5 23.5T400-480q0 33 23.5 56.5T480-400Zm0-80ZM200-120q-33 0-56.5-23.5T120-200v-160h80v160h160v80H200Zm400 0v-80h160v-160h80v160q0 33-23.5 56.5T760-120H600ZM120-600v-160q0-33 23.5-56.5T200-840h160v80H200v160h-80Zm640 0v-160H600v-80h160q33 0 56.5 23.5T840-760v160h-80Z"/>
                </svg>
            </button>`;

        this.tools.elements.container = document.createElement('div');
        this.tools.elements.container.id = 'graph-tools';
        this.tools.elements.container.innerHTML = html;
        this.mount.append(this.tools.elements.container);

        this.tools.elements.recenter = this.tools.elements.container.querySelector('#graph-recenter');
        this.tools.elements.recenter.addEventListener('click', () => {
            graphObject.zoomToFit(this.tools.config.recenterSpeed);
        });

        this.tools.elements.zoomIn = this.tools.elements.container.querySelector('#graph-zoom-in');
        this.tools.elements.zoomIn.addEventListener('click', () => {
            graphObject.zoom(graphObject.zoom() * this.tools.config.zoomInIncrement, this.tools.config.zoomInSpeed);
        });

        this.tools.elements.zoomOut = this.tools.elements.container.querySelector('#graph-zoom-out');
        this.tools.elements.zoomOut.addEventListener('click', () => {
            graphObject.zoom(graphObject.zoom() * this.tools.config.zoomOutIncrement, this.tools.config.zoomOutSpeed);
        });
    }

    _setupMenu(graphObject) {
        const html = `
            <style>
                .menu-bar {
                    align-items: center;
                    border-bottom: 1px solid #DADCE0;
                    box-sizing: border-box;
                    color: #3C4043;
                    display: flex;
                    padding: 16px 24px 16px 16px;
                    width: 100%;
                }
                .menu-item {
                    display: flex;
                    margin-right: 16px;
                }
                .toggle-container {
                    display: flex;
                    align-items: center;
                    height: 100%;
                }
                .toggle-switch {
                    position: relative;
                    display: inline-block;
                    width: 46px;
                    height: 24px;
                    flex-shrink: 0;
                }
                .toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                    margin: 0;
                    padding: 0;
                }
                .toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #e9ecef;
                    transition: .4s;
                    border-radius: 24px;
                }
                .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: .3s;
                    border-radius: 50%;
                }
                input:checked + .toggle-slider {
                    background-color: #228be6;
                }
                input:checked + .toggle-slider:before {
                    transform: translateX(22px);
                }
                .toggle-label {
                    margin-left: 8px;
                    color: #202124;
                    line-height: 24px;
                }
                .graph-element-tooltip {
                    font: 12px 'Google Sans', 'Roboto', sans-serif;
                    position: absolute;
                    padding: 4px 8px;
                    box-sizing: border-box;
                    pointer-events: none;
                    transition: opacity 0.2s ease-in-out;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                    border-radius: 4px;
                }
                
                /* Ensure .graph-tooltip built-in from force-graph does not interfere */
                .graph-tooltip {
                    background: none !important;
                    border: none !important;
                    padding: 0 !important;
                }

                .dropdown {
                    margin-right: 16px;
                    position: relative;
                }

                .dropdown-toggle {
                    appearance: none;
                    background: url("data:image/svg+xml;utf8,<svg fill='rgba(73, 80, 87, 1)' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>") no-repeat;
                    background-position: right 10px center;
                    background-color: white;
                    padding: 12px 40px 12px 16px;
                    border: 1px solid #80868B;
                    border-radius: 4px;
                    color: #3C4043;
                    cursor: pointer;
                    font-size: 16px;
                    text-align: left;
                    width: 260px;
                }

                .arrow-down {
                    margin-left: 5px;
                    font-size: 10px;
                }

                .dropdown-content {
                    display: none;
                    position: absolute;
                    background-color: #fff;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                    z-index: 1;
                    top: 100%;
                    left: 0;
                    padding: 8px 0;
                }

                .dropdown:hover .dropdown-content {
                    display: block;
                }

                .dropdown-item {
                    color: #495057;
                    padding: 8px 32px 8px 8px;
                    text-decoration: none;
                    display: flex;
                    align-items: center;
                }

                .dropdown .dropdown-item.selected {
                    background: url("data:image/svg+xml;utf8,<svg height='24' viewBox='0 0 24 24' width='24' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M2 6L5 9L10 3' stroke='rgba(73, 80, 87, 1)' stroke-width='2' stroke-linecap='square'/></svg>") no-repeat;
                    background-position: left 15px top 8px;
                }

                .dropdown-item:hover {
                    background-color: #f8f9fa;
                }

                .checkmark {
                    width: 20px;
                    margin-right: 8px;
                }

                .element-count {
                    color: #000;
                    display: flex;
                    flex: 1;
                    font-weight: 500;
                }

                .item-text {
                    flex: 1;
                }
            </style>
            <div class="menu-bar">
                <div class="dropdown">
                    <button class="dropdown-toggle">
                        Force layout
                    </button>
                    <div class="dropdown-content">
                        <a href="#" class="dropdown-item selected" data-layout="">
                            <span class="checkmark"></span>
                            <span class="item-text">Force layout</span>
                        </a>
                        <a href="#" class="dropdown-item" data-layout="td">
                            <span class="checkmark"></span>
                            <span class="item-text">Hierarchical: Top down</span>
                        </a>
                        <a href="#" class="dropdown-item" data-layout="lr">
                            <span class="checkmark"></span>
                            <span class="item-text">Hierarchical: Left-to-right</span>
                        </a>
                        <a href="#" class="dropdown-item" data-layout="radialin">
                            <span class="checkmark"></span>
                            <span class="item-text">Radial: Inward</span>
                        </a>
                        <a href="#" class="dropdown-item" data-layout="radialout">
                            <span class="checkmark"></span>
                            <span class="item-text">Radial: Outward</span>
                        </a>
                    </div>
                </div>
                
                <div class="element-count">
                    ${this.store.config.nodes.length} nodes, ${this.store.config.edges.length} edges
                </div>
                <div class="toggle-container">
                    <label class="toggle-switch">
                        <input id="show-labels" type="checkbox">
                        <span class="toggle-slider"></span>
                    </label>
                    <span class="toggle-label">Show labels</span>
                </div>
            </div>`

        this.menuMount.innerHTML = html;

        this.menu.elements.layoutButtons = this.menuMount.querySelectorAll('.dropdown-item');
        
        this.menuMount.querySelector('.dropdown-content').addEventListener('click', e => {
            const title = this.menuMount.querySelector('.dropdown-toggle');
            const layoutButton = e.target.closest('.dropdown-item');
            if (!layoutButton) return;
        
            this.menu.elements.layoutButtons.forEach(button => {
                button.className = button === layoutButton ? 'dropdown-item selected' : 'dropdown-item';
            });
            
            if (title) {
                title.textContent = layoutButton.textContent;
            }
            
            try {
                const newLayout = layoutButton.getAttribute('data-layout');
                this.menu.config.lastLayout = this.graph.dagMode;
                this.menu.config.currentLayout = newLayout;
                this.graph.dagMode(newLayout);
            } catch (error) {
                console.error('Error updating graph layout:', error);
            }

        });

        this.menu.elements.showLabels = this.menuMount.querySelector('#show-labels');
        this.menu.elements.showLabels.addEventListener('change', () => {
            this.menu.config.showLabels = this.menu.elements.showLabels.checked;
        
            if (this.menu.config.showLabels) {
                // Pass an array of all nodes and edges to refreshTooltips
                this.refreshTooltips(this.graph.graphData().nodes); 
            } else {
                this.refreshTooltips([this.store.config.selectedGraphObject]);
            }
        });        
    }

    createTooltip(node) {
        const container = document.querySelector('.force-graph-container');
        const toolTipElem = document.createElement('div');
        toolTipElem.style.backgroundColor = this.store.getColorForNode(node); // Use node color
        toolTipElem.style.borderRadius = '.25rem';
        toolTipElem.style.color = 'white';
        toolTipElem.style.position = 'absolute';
        toolTipElem.style.visibility = 'visible';
        toolTipElem.style.pointerEvents = 'none';
        toolTipElem.style.padding = '4px 8px';
        toolTipElem.style.fontSize = '12px';
        toolTipElem.style.color = '#FFF';

        let tipContent = ``;

        if (node.properties && node.key_property_names) {
            if (node.key_property_names.length == 1) {
                const propName = node.key_property_names[0];
                if (node.properties.hasOwnProperty(propName)) {
                    tipContent = `<div>${this.sanitize(node.properties[propName])}</div>`;
                }
            } else {
                for (const key of node.key_property_names) {
                    if (node.properties.hasOwnProperty(key)) {
                        tipContent += `<div>${key}: ${this.sanitize(node.properties[key])}</div>`
                    }
                }
            }
        }

        toolTipElem.innerHTML = tipContent;
        container.appendChild(toolTipElem);

        return toolTipElem;
    }

    /**
     * Callback for GraphStore.EventTypes.CONFIG_CHANGE events.
     * @param {GraphConfig} config - The new configuration.
    */
    onStoreConfigChange(config) {
        this.render(config);
    }

    onSelectedEdgeChanged(edge) {
        this.selectedEdge = edge;
        this.selectedEdgeNeighbors = [];

        this.selectedEdgeNeighbors = [
            edge.source, edge.target
        ];
        this.store.setFocusedObject(edge.source); 
        this.store.setFocusedObject(edge.target);
        this.refreshTooltips(this.selectedEdgeNeighbors); 
    }

    onSelectedNodeChanged(node) {
        this.selectedNode = node;

        // We could center the graph on the node

        // This is duplicated between onSelectedNodeChange and onFocusedNodeChange.
        // This could be extracted to a separate function.
        const { nodes, links } = this.graph.graphData();

        this.selectedNodeEdges = links.filter(
            link => link.source.id === node.id || link.target.id === node.id);;

        this.selectedNodeNeighbors = nodes.filter(n => {
            const selectedEdges = this.selectedNodeEdges.filter(link => link.source.id === n.id || link.target.id === n.id);
            const containsEdges = selectedEdges.length > 0;
            if (containsEdges) {
                this.selectedNodeEdges.push(...selectedEdges);
            }

            return containsEdges;
        });

        this.graph.centerAt(node.x, node.y, 1000);
        this.graph.zoom(4, 1000);

    }

    onFocusedEdgeChanged(edge) {
        this.focusedEdge = edge;
        this.focusedEdgeNodes = [];
        this.focusedNodeNeighbors = [];

        if (!this.focusedEdge) {
            // There are multiple conditions that will trigger a false here,
            // and we want to enforce null type.
            this.focusedEdge = null;
            return;
        }

        this.focusedEdgeNeighbors = [
            this.focusedEdge.source,
            this.focusedEdge.target
        ]
    }

    /**
     * Highlights the focused node as well as its edges and neighbors
     * @param {Node|null} node - The node to highlight. If null, the highlight is removed.
     */
    onFocusedNodeChanged(node) {
        this.focusedNode = node;
        this.focusedNodeEdges = [];
        this.focusedNodeNeighbors = [];

        if (!this.focusedNode) {
            return;
        }

        const { nodes, links } = this.graph.graphData();
        const focusedNodeEdges = links.filter(link => link.source.id === node.id || link.target.id === node.id);
        this.focusedNodeEdges.push(...focusedNodeEdges);
        this.focusedNodeNeighbors = nodes.filter(n => {
            if (n.id === node.id) {
                return false;
            }

            const focusedEdges = this.focusedNodeEdges.filter(link => link.source.id === n.id || link.target.id === n.id);
            return focusedEdges.length > 0;
        });
    }

    _setupLineLength(graph) {
                
        this.graph.calculateLineLengthByCluster = () => {
            this.graph
                .d3Force('link').distance(link => {
                    let distance = Math.log10(this.store.config.nodes.length) * 15;

                    // Only apply neighborhood clustering logic if using force layout
                    if (this.graph.dagMode() === '') {
                        distance = link.source.neighborhood == link.target.neighborhood ? distance * 0.5 : distance * 0.8;
                    } else {
                        // For other layouts, you might want a different distance calculation
                        distance = null; // Example: Fixed distance for non-force layouts
                    }
                    return distance;
                });
             return graph;
        }
    }

    _setupDrawEdges(graph) {
        let selfLoopLinks = {};
        let sameNodesLinks = {};
        const curvatureMinMax = 0.25;

        // 1. assign each link a nodePairId that combines their source and target independent of the links direction
        // 2. group links together that share the same two nodes or are self-loops
        this.store.config.edges.forEach(link => {
            link.nodePairId = link.source <= link.target ? (link.source + "_" + link.target) : (link.target + "_" + link.source);
            let map = link.source === link.target ? selfLoopLinks : sameNodesLinks;
            if (!map[link.nodePairId]) {
                map[link.nodePairId] = [];
            }
            map[link.nodePairId].push(link);
        });

        // Compute the curvature for self-loop links to avoid overlaps
        Object.keys(selfLoopLinks).forEach(id => {
            let links = selfLoopLinks[id];
            let lastIndex = links.length - 1;
            links[lastIndex].curvature = 1;
            let delta = (1 - curvatureMinMax) / lastIndex;
            for (let i = 0; i < lastIndex; i++) {
                links[i].curvature = curvatureMinMax + i * delta;
            }
        });

        // Compute the curvature for links sharing the same two nodes to avoid overlaps
        Object.keys(sameNodesLinks).filter(nodePairId => sameNodesLinks[nodePairId].length > 1).forEach(nodePairId => {
            let links = sameNodesLinks[nodePairId];
            let lastIndex = links.length - 1;
            let lastLink = links[lastIndex];
            lastLink.curvature = curvatureMinMax;
            let delta = 2 * curvatureMinMax / lastIndex;
            for (let i = 0; i < lastIndex; i++) {
                links[i].curvature = - curvatureMinMax + i * delta;
                if (lastLink.source !== links[i].source) {
                    links[i].curvature *= -1; // flip it around, otherwise they overlap
                }
            }
        });

        graph.drawEdges = (node, ctx, globalScale) => {
            this.graph
                // this will be extracted to a wrapper function for
                // curvature heuristic
                .linkCurvature(link => link.curvature)
                // this will be extracted to a wrapper function for
                // -> hiding labels upon zooming out past a threshold
                // -> hide when large amount of edges shown
                //    -> show edges for node that the user highlights
                // -> settings menu
                // -> or some other heuristic
                .linkDirectionalArrowLength(4)
                .calculateLineLengthByCluster()
                .linkDirectionalArrowRelPos(0.9875)
                .linkCurvature('curvature')
                .linkWidth(link => {
                    let edgeDesign = this.store.getEdgeDesign(link);
                    return edgeDesign.width;
                })
                .linkColor(link => {
                    let edgeDesign = this.store.getEdgeDesign(link);
                
                    // Check if ANY node OR edge is focused or selected
                    const isAnyElementFocusedOrSelected =
                        this.store.config.focusedGraphObject instanceof Node ||
                        this.store.config.selectedGraphObject instanceof Node ||
                        this.store.config.focusedGraphObject instanceof Edge ||
                        this.store.config.selectedGraphObject instanceof Edge;
                
                    // Lighten the edge color if an element is focused or selected
                    // and the edge is NOT connected to it
                    if (isAnyElementFocusedOrSelected && 
                        !this.store.edgeIsConnectedToFocusedNode(link) &&
                        !this.store.edgeIsConnectedToSelectedNode(link) &&
                        link !== this.store.config.focusedGraphObject && // Check for focused edge
                        link !== this.store.config.selectedGraphObject) { // Check for selected edge
                
                        const lightenAmount = 0.48;
                        const originalColor = edgeDesign.color;
                        const lightenedColor = this.lightenColor(originalColor, lightenAmount);
                        return lightenedColor;
                    } else {
                        return edgeDesign.color; // Return original color
                    }
                })
                .labelsOnEdges(2);

            return graph;
        }
    }

    // Helper function to lighten a color
    lightenColor(color, amount) {
        const usePound = color[0] === '#';
        let R = parseInt(color.substring(usePound ? 1 : 0, usePound ? 3 : 2), 16);
        let G = parseInt(color.substring(usePound ? 3 : 2, usePound ? 5 : 4), 16);
        let B = parseInt(color.substring(usePound ? 5 : 4, usePound ? 7 : 6), 16);

        R = Math.floor((R * (1 - amount)) + (255 * amount));
        G = Math.floor((G * (1 - amount)) + (255 * amount));
        B = Math.floor((B * (1 - amount)) + (255 * amount));

        const RR = ((R.toString(16).length == 1) ? "0" + R.toString(16) : R.toString(16));
        const GG = ((G.toString(16).length == 1) ? "0" + G.toString(16) : G.toString(16));
        const BB = ((B.toString(16).length == 1) ? "0" + B.toString(16) : B.toString(16));

        return "#" + RR + GG + BB;
    }

    _setupDrawNodes(graph) {
        graph.drawNodes = () => {
            this.graph
                .nodeCanvasObject(
                    /**
                     * Callback function to draw nodes based off of the current config state.
                     * @param {Node} node - The node object
                     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
                     * @param {number} globalScale - The global scale of the graph
                     */
                    (node, ctx, globalScale) => {

                        let lightenAmount = 0;

                        // If a node is selected OR hovered...
                        if (this.store.config.selectedGraphObject instanceof Node ||
                            this.store.config.focusedGraphObject instanceof Node) {

                            // Lighten all nodes...
                            lightenAmount = 0.64;

                            // ...unless it's the selected or hovered node itself...
                            if (node === this.store.config.selectedGraphObject ||
                                node === this.store.config.focusedGraphObject) {
                                lightenAmount = 0;
                            }
                            // ...or if it's connected to the selected or hovered node.
                            else if (this.selectedNodeNeighbors.includes(node) ||
                                     this.focusedNodeNeighbors.includes(node)) {
                                lightenAmount = 0;
                            }
                        }

                        // If an edge is selected...
                        if (this.store.config.selectedGraphObject instanceof Edge) {
                            // Lighten all nodes...
                            lightenAmount = 0.64;

                            // ...unless they are connected to the selected edge.
                            if (this.selectedEdgeNeighbors.includes(node)) {
                                lightenAmount = 0;
                            }
                        }

                        const isFocusedOrHovered = node === this.store.config.selectedGraphObject || node === this.store.config.focusedGraphObject;
                        if (isFocusedOrHovered) {
                            // draw stroke
                            let strokeSize = 0;
                            let strokeSeparationSize = this.getNodeRelativeSize() * 0.125;
                            if (node === this.store.config.selectedGraphObject) {
                                strokeSize = this.getNodeRelativeSize() * .75;
                            } else {
                                strokeSize = this.getNodeRelativeSize() * 0.5;
                            }

                            ctx.beginPath();
                            ctx.strokeStyle = `rgba(26, 115, 232, .24)`;
                            ctx.lineWidth = strokeSize;
                            ctx.fillStyle = 'rgba(0, 0, 0, 0)';
                            ctx.arc(node.x, node.y,
                                this.getNodeRelativeSize() + strokeSeparationSize + strokeSize / 2,
                                0, 2 * Math.PI, false);
                            ctx.stroke();
                        }

                        // This draws the circle for the node
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, this.getNodeRelativeSize(), 0, 2 * Math.PI, false);
                        ctx.fillStyle = this.store.getColorForNode(node);
                        ctx.fill();


                        // lighten the node color
                        if (lightenAmount > 0) {
                            ctx.beginPath();
                            ctx.arc(node.x, node.y, this.getNodeRelativeSize(), 0, 2 * Math.PI, false);
                            ctx.fillStyle = `rgba(255, 255, 255, ${lightenAmount})`;
                            ctx.fill();
                        }

                        if (!this.tooltips[node.id]) {
                            return;
                        }

                        // position the tooltip over the node
                        const coords = this.graph.graph2ScreenCoords(node.x, node.y);
                        const tooltipHeight = this.tooltips[node.id].offsetHeight;
                        const tooltipWidth = this.tooltips[node.id].offsetWidth;
                        const x = coords.x - (tooltipWidth / 2);
                        const y = coords.y - (tooltipHeight * 0.5);
                        this.tooltips[node.id].style.top = `${y}px`;
                        this.tooltips[node.id].style.left = `${x}px`;
                    });

            return graph;
        }
    }

    _generateGraphElementTooltip(element) {
        let color = "#a9a9a9";
        if (element instanceof Node) {
            color = this.store.getColorForNode(element);
        }
        let content = `
            <div class="graph-element-tooltip" style="background-color: ${color}">
                <div><strong>${this.sanitize(element.label)}</strong></div>`;

        if (element.properties) {
            if (element.key_property_names.length == 1) {
                for (const key of element.key_property_names) {
                    if (element.properties.hasOwnProperty(key)) {
                        content += `<div>${this.sanitize(element.properties[key])}</div>`
                    }
                }
            } else {
                for (const key of element.key_property_names) {
                    if (element.properties.hasOwnProperty(key)) {
                        content += `<div>${key}: ${this.sanitize(element.properties[key])}</div>`
                    }
                }
            }
        }

        content += '</div>'
        return content;
    }

    _setupDrawLabelsOnEdges(graph) {
        /**
         * Draw labels on edges
         * @param {number} Labels will disappear after the global scale
         * has exceeded this number (aka the user has zoomed out past a threshold)
         */
        graph.labelsOnEdges = (maxGlobalScale) => {
            graph
                .linkCanvasObjectMode(() => 'after')
                .linkLabel(link => {
                    if (this.store.config.selectedGraphObject) {
                        return '';
                    }
                    return ''
                })
                .linkCanvasObject(
                    /**
                     * Draw labels on edges
                     * @param {Edge} link - The link object
                     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
                     * @param {number} globalScale - The global scale of the graph
                     */
                    (link, ctx, globalScale) => {

                        const isSelected = this.selectedEdge && link === this.selectedEdge;
                        const isFocused = this.focusedEdge && link === this.focusedEdge;

                        const showLabel = () => {
                            // 1. Prioritize focused edge
                            if (this.focusedEdge && link === this.focusedEdge) {
                              return true; // Always show label for focused edge
                            }
                          
                            // 2. Show label if a node is selected and the edge is connected to it
                            if (this.selectedNode && this.store.edgeIsConnectedToSelectedNode(link)) {
                              return true;
                            }
                          
                            // 3. Show label if the edge is selected
                            if (this.selectedEdge && link === this.selectedEdge) {
                              return true; // Always show label for selected edge
                            }
                          
                            // 4. Show labels if within zoom tolerance and no node or edge is focused/selected
                            const focusedOrSelectedObjectExists = this.focusedEdge || this.selectedEdge || this.focusedNode || this.selectedNode;
                            const withinZoomTolerance = globalScale > maxGlobalScale;
                            if (withinZoomTolerance && !focusedOrSelectedObjectExists) {
                              return true;
                            }

                            // 5. Otherwise, hide the label
                            return false;
                        };

                        if (!showLabel()) {
                            return;
                        }

                        const boldFont = () => {
                            if (this.selectedEdge) {
                                return link == this.selectedEdge;
                            }

                            if (this.selectedNode && this.focusedNode && this.selectedNode != this.focusedNode) {
                                return (link.source == this.selectedNode || link.target == this.selectedNode) &&
                                    (link.source == this.focusedNode || link.target == this.focusedNode);
                            }

                            return false;
                        };

                        // const MAX_FONT_SIZE = 3;
                        // const MIN_FONT_SIZE = 1;
                        // const LABEL_NODE_MARGIN = 2;

                        const start = link.source;
                        const end = link.target;
                        if (typeof start !== 'object' || typeof end !== 'object') return;

                        // Initialize text position
                        let textPos = {
                            x: (start.x + end.x) * 0.5,
                            y: (start.y + end.y) * 0.5
                        };

                        // Get control points
                        const controlPoints = link.__controlPoints;

                        if (link.curvature !== 0 && controlPoints) {
                            if (link.source === link.target) {
                                // Self-loop
                                textPos = {
                                    x: controlPoints[0] + (controlPoints[2] - controlPoints[0]) * 0.5,
                                    y: controlPoints[1] + (controlPoints[3] - controlPoints[1]) * 0.5
                                };
                            } else {
                                // Use midpoint of quadratic Bezier curve
                                const t = 0.5;
                                textPos = {
                                    x: Math.pow(1 - t, 2) * start.x + 2 * (1 - t) * t * controlPoints[0] + Math.pow(t, 2) * end.x,
                                    y: Math.pow(1 - t, 2) * start.y + 2 * (1 - t) * t * controlPoints[1] + Math.pow(t, 2) * end.y
                                };
                            }
                        }

                        // Calculate text angle
                        let textAngle = Math.atan2(end.y - start.y, end.x - start.x);
                        if (textAngle > Math.PI / 2) textAngle = -(Math.PI - textAngle);
                        if (textAngle < -Math.PI / 2) textAngle = -(-Math.PI - textAngle);

                        // Calculate font size based on link length
                        let label = link.label;
                        let labelTail = '';
                        const relLink = { x: end.x - start.x, y: end.y - start.y };
                        const linkLength = Math.sqrt(relLink.x * relLink.x + relLink.y * relLink.y);
                        const maxTextLength = linkLength - 5;

                        const fontSize = 2;
                        // Set text style based on focus OR selection
                        const defaultTextStyle = 'normal'; // Default text style
                        const highlightedTextStyle = 'bold'; // Style when focused or selected

                        ctx.font = `${isFocused || isSelected ? highlightedTextStyle : defaultTextStyle} ${fontSize}px Sans-Serif`;

                        const textWidth = () => (ctx.measureText(label).width + ctx.measureText(labelTail).width) * 2;
                        while (textWidth() > maxTextLength) {
                            if (label.length <= 1) {
                                break;
                            }

                            label = label.substring(0, label.length - 1);
                            labelTail = '...';
                        }
                        label = label + labelTail;
                        const textRect = ctx.measureText(label);

                        ctx.save();
                        ctx.translate(textPos.x, textPos.y);
                        ctx.rotate(textAngle);

                        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
                        ctx.fillRect((-textRect.width / 2)-1, (-fontSize / 2)-1, textRect.width + 2, fontSize + 2, 1);

                        // Set text color based on focus OR selection
                        const defaultTextColor = '#9AA0A6'; // Default color
                        const focusedTextColor = '#3C4043'; // Color when focused
                        const selectedTextColor = '#1A73E8'; // Color when selected

                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        const textVerticalOffset = -Math.abs(textRect.actualBoundingBoxAscent - textRect.actualBoundingBoxDescent) * 0.25;
                        ctx.fillStyle = isSelected
                        ? selectedTextColor
                        : isFocused
                            ? focusedTextColor
                            : defaultTextColor;
                        ctx.fillText(label, 0, textVerticalOffset);

                        ctx.strokeStyle = isSelected
                        ? selectedTextColor
                        : defaultTextColor;
                        ctx.lineWidth = .5;
                        ctx.strokeRect((-textRect.width / 2)-1 , (-fontSize / 2)-1, textRect.width + 2, fontSize + 2);

                        ctx.restore();
                    });
            return graph;
        };
    }

    /**
     * Renders the graph visualization.
     * @param {GraphConfig} config - The configuration to render.
     */
    render(config) {
        const graphData = {
            nodes: config.nodes,
            links: config.edges
        }

        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = this.mount.offsetWidth;
        offscreenCanvas.height = this.mount.offsetHeight;
        const offscreenCtx = offscreenCanvas.getContext('2d');

        this.graph
            // The canvas can sometimes exceed
            // the dimensions of the HTMLElement
            // it is mounted to. This fixes
            // that issue.
            .width(this.mount.offsetWidth)
            .height(this.mount.clientHeight)
            .nodeId('id')
            .nodeVal('value')
            .nodeLabel(node => {
                return this._generateGraphElementTooltip(node);
            })
            .nodeColor('color')
            .linkSource('source')
            .linkTarget('target')
            .linkLabel(link => '')
            // .enablePointerInteraction(false)
            // If paused, mouse events stop.
            // Pausing improves performance,
            // and is something to keep in mind
            // when we run into performance bottlenecks.
            .autoPauseRedraw(false)
            // These handlers should be extracted to a
            // wrapper function similar to .drawNodes()
            .onNodeHover(node => {
                if (!this.store.config.focusedGraphObject || !(this.store.config.focusedGraphObject instanceof Edge)) { 
                    this.store.setFocusedObject(node);
                }
            })
            .onNodeDragEnd(node => {
                node.fx = node.x;
                node.fy = node.y;
            })
            .onNodeClick(node => {
                this.store.setSelectedObject(node);
            })
            .onLinkHover(link => {
                this.store.setFocusedObject(link);
            })
            .onLinkClick(link => {
                this.store.setSelectedObject(link);
            })
            .onBackgroundClick(event => {
                this.store.setSelectedObject(null);
            })
            .d3Force('collide', d3.forceCollide(16))
            .calculateLineLengthByCluster()
            .drawNodes()
            .drawEdges()
            .cooldownTicks(1000)
            .cooldownTime(1250);

        // fit to canvas when engine stops
        this.graph.onEngineStop(() => {
            this.graph.zoomToFit(1000, 16);
        });

        this.graph.graphData(graphData);
    }
}

const clamp = (input, min, max) => {
    return input < min ? min : input > max ? max : input;
}

const map = (current, in_min, in_max, out_min, out_max) => {
    const mapped = ((current - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min;
    return clamp(mapped, out_min, out_max);
}

const getPositionAroundPoint = (link, source, target) => {
    if (!target) {
        return null;
    }

    // Filter the links array to find all links with the same source and target
    const relatedLinks = json.links.filter(l =>
        (l.source === source && l.target === target) ||
        (l.source === target && l.target === source)
    );

    // Loop over relatedLinks to find the matching link
    let linkIndex = -1;
    for (let i = 0; i < relatedLinks.length; i++) {
        const sourceNode = relatedLinks[i].source;
        if (relatedLinks[i].source.id == source.id &&
            relatedLinks[i].target.id == target.id
        ) {
            linkIndex = i;
            break;
        }
    }

    // If the link wasn't found, return null or handle the error as appropriate
    if (linkIndex === -1) {
        console.error('Link not found in related links');
        return null;
    }

    const angle = (linkIndex / 50) * Math.PI * 2;
    // Calculate the normalized direction vector
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);

    // Define a scalar for the distance from the source
    const scalar = 16; // Adjust this value to change the circle radius

    // Calculate the new position
    const newX = source.x + directionX * scalar;
    const newY = source.y + directionY * scalar;

    return { x: newX, y: newY };
}

window[namespace].GraphVisualization = GraphVisualization;

let idCounter = 200;

const mockData =
{
    "directed": false,
    "multigraph": false,
    "graph": {},
    "nodes": [
        {
            "id": 0
        },
        {
            "id": 1
        },
        {
            "id": 2
        },
        {
            "id": 3
        },
        {
            "id": 4
        },
        {
            "id": 5
        },
        {
            "id": 6
        },
        {
            "id": 7
        },
        {
            "id": 8
        },
        {
            "id": 9
        }
    ].map(node => {
        const labels = ['person', 'account', 'camelcase test'];
        const colors = ['#ec0001', '#00a2ff', '#00ff00'];
        const rand = Math.random();
        const properties = {};
        for (let i = 0; i < 5; i++) {
            properties[`key ${i}`] = `value ${i}`;
        }
        return {
            ...node,
            label: rand > 0.66 ? labels[0] :
                rand > 0.33 ? labels[1] :
                    labels[2],
            color: rand > 0.66 ? colors[0] :
                rand > 0.33 ? colors[1] :
                    colors[2],
            properties
        };
    }),
    "links": [
        {
            "source": 0,
            "target": 1
        },
        {
            "source": 0,
            "target": 2
        },
        {
            "source": 0,
            "target": 3
        },
        {
            "source": 0,
            "target": 4
        },
        {
            "source": 0,
            "target": 5
        },
        {
            "source": 0,
            "target": 8
        },
        {
            "source": 2,
            "target": 6
        },
        {
            "source": 0,
            "target": 7
        },
        {
            "source": 2,
            "target": 9
        },
        {
            "source": 3,
            "target": 4
        },
        {
            "source": 2,
            "target": 6
        },
        {
            "source": 0,
            "target": 7
        },
        {
            "source": 2,
            "target": 9
        },
        {
            "source": 3,
            "target": 4
        }
    ].map(edge => {
        const labels = ['transaction', 'closure', 'creation'];
        const rand = Math.random();
        const properties = {};
        for (let i = 0; i < 5; i++) {
            properties[`key ${i}`] = `value ${i}`;
        }
        idCounter++;
        return {
            ...edge,
            id: idCounter,
            to: edge.target,
            from: edge.source,
            label: rand > 0.66 ? labels[0] :
                rand > 0.33 ? labels[1] :
                    labels[2],
            properties
        };
    })
}

window[namespace].mockData = mockData;