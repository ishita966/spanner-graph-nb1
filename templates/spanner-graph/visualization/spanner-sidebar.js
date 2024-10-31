/* # Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
 */

class Sidebar {
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
     * The currently selected node.
     * @type {GraphObject|null}
     */
    selectedObject = null;

    /**
     * The edges connected to the currently selected node.
     * @type {Edge[]}
     */
    edges = [];

    /**
     * @type {Map<HTMLElement, Edge>}
     */
    edgesAssignedToHtmlELement = {}


    neighbors = [];


    /**
     * @typedef {Object} SidebarElements
     * @property {HTMLElement|null} sidebar - The main sidebar container element
     * @property {HTMLElement|null} sidebarHeader - The header section of the sidebar
     * @property {HTMLElement|null} sidebarTitle - The title element within the sidebar header
     * @property {HTMLElement|null} sidebarContent - The content container of the sidebar
     * @property {HTMLElement|null} nodeProperties - The container for node properties
     * @property {HTMLElement|null} nodeType - The element displaying the node type
     * @property {HTMLElement|null} nodePropertyList - The list container for node properties
     * @property {HTMLElement|null} edgeGroups - The container for edge group information
     * @property {HTMLElement|null} edgeGroupHeader - The header for edge group information
     */

    /** @type {SidebarElements} */
    elements = {
        sidebar: null,
        sidebarHeader: null,
        sidebarTitle: null,
        sidebarContent: null,
        nodeProperties: null,
        nodeType: null,
        nodePropertyList: null,
        edgeGroups: null,
        edgeGroupsHeader: null
    };

    createdEdgeGroups = {};

    constructor(inStore, inMount) {
        this.store = inStore;
        this.mount = inMount;
        this.constructSidebar();

        this.initializeEvents(this.store);
    }

    /**
     *
     * @param {Edge} edge
     */
    constructSelectedEdge(edge) {
        /**
         * @param {Node} node
         */
        const html = `
            <div class="node-neighbors">
                <div class="node-neighbor">
                    <div class="section-header">
                        <div class="node-neighbor-label">${edge.label}</div>
                        <div class="node-neighbor-destination>source</div>
                    </div>
                    <div class="property-list">
                        ${Object.keys(edge.properties).forEach(key => (
                            this.createPropertyItem(key, edge.properties[key])
                        ))}
                    </div>
                </div>
                <div class="node-neighbor">
                    <div class="node-neighbor-label">{label}</div>
                    <div class="property-list">
                        <div class="node-neighbor-value">{value}</div>
                            <div class="property-item"></div>
                        </div>
                    </div>
                </div>
            </div>
            `
    }

    /**
     *
     * @param {Node} node
     * @returns
     */
    createNeighborNode(node) {
        const edgeGroup = document.createElement('div');
        edgeGroup.className = 'edge-group';
        edgeGroup.innerHTML = `
            <div class="edge-group-header">
                <span class="edge-type">${node.label || 'Unlabeled Node'}</span>
            </div>
            <div class="edge-group-content"></div>`;

        if (!node.propertes) {
            return;
        }

        const header = edgeGroup.querySelector('.edge-group-header');
        header.addEventListener('click', () => this.toggleEdgeGroup(header));

        const content = edgeGroup.querySelector('.edge-group-content');
        const edgeItem = document.createElement('div');
        edgeItem.className = 'edge-item';
        edgeItem.innerHTML = `
            <div class="property-list edge-properties"></div>`;

        const edgeProperties = edgeItem.querySelector('.edge-properties');
        for (const [property, value] of Object.entries(node.properties)) {
            const edgeProperty = this.createPropertyItem(property, value);
            edgeProperties.appendChild(edgeProperty);
        }
        `
`
        content.appendChild(edgeItem);
        edgeGroup.appendChild(content);

        this.elements.edgeGroups.appendChild(edgeGroup);
    }

    toCamelCase(str) {
        return str
            // Split the string into words using a regex that matches spaces, underscores, and hyphens
            .split(/[\s_\-]+/)
            // Map through the words, converting the first letter of each word to uppercase,
            // except for the first word, which is converted to lowercase.
            .map((word, index) => {
                if (index === 0) {
                    return word.toLowerCase();
                }
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            // Join the words back together
            .join('');
    }

    constructSidebar() {
        const sidebar = this.mount;
        sidebar.className = 'sidebar';

        if (!this.selectedObject) {
            sidebar.style.display = 'none';
        } else {
            sidebar.style.display = 'initial';
        }

        const titleHtml = () => {
            if (!this.selectedObject) {
                return;
            }

            if (this.selectedObject instanceof Node) {
                return `
                    <div class="panel-header">
                        <h2>
                            <span style="background-color: ${this.store.getColorForNode(this.selectedObject)}" class="order-label">${this.selectedObject.label}</span>
                            <span>${showNodeKeyProperty(this.selectedObject)}</span>
                        </h2>
                        <button class="close-btn" id="js-close-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3C4043">
                                <path d="m336-280-56-56 144-144-144-143 56-56 144 144 143-144 56 56-144 143 144 144-56 56-143-144-144 144Z"/>
                            </svg>
                        </button>
                    </div>
                `;
            }

            return `
                <div class="panel-header">
                    <h2><span class="edge-title">${this.selectedObject.label}</span></h2>
                    <button class="close-btn" id="js-close-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3C4043">
                            <path d="m336-280-56-56 144-144-144-143 56-56 144 144 143-144 56 56-144 143 144 144-56 56-143-144-144 144Z"/>
                        </svg>
                    </button>
                </div>
            `;
        }

        function showNodeKeyProperty(node) {
            let prop = '';
            if (node.properties && node.key_property_names) {
                if (node.key_property_names.length == 1) {
                    const propName = node.key_property_names[0];
                    if (node.properties.hasOwnProperty(propName)) {
                        prop = node.properties[propName];
                    }
                } else {
                    const props = []
                    for (const key of node.key_property_names) {
                        if (node.properties.hasOwnProperty(key)) {
                            const p = `<b>${key}:</b> ${node.properties[key]}`;
                            props.push(p)
                        }
                    }
                    prop = props.join(", ")
                }
            }
            return prop;
        }

        const neighborHtml = (container) => {
            if (!this.selectedObject || !this.selectedObject.properties) {
                return;
            }

            const section = document.createElement('div');
            section.className = 'section';
            section.innerHTML = `
                <div class="section-header">
                    <h3>Neighbors <span class="count">${this.neighbors.length}</span></h3>
                    <span class="arrow">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3C4043">
                            <path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z"/>
                        </svg>
                    </span>
                </div>
                <div class="section-content">
                </div>
            `;
            container.appendChild(section);

            function toggleSection(header) {
                const content = header.nextElementSibling;
                const arrow = header.querySelector('.arrow');

                if (content.style.display === 'none') {
                    content.style.display = 'block';
                    arrow.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3C4043">
                            <path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z"/>
                        </svg>
                    `; // Down-pointing caret
                } else {
                    content.style.display = 'none';
                    arrow.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3C4043">
                            <path d="M480-528 296-344l-56-56 240-240 240 240-56 56-184-184Z"/>
                        </svg>
                    `; // Up-pointing caret
                }
            }

            const sectionContent = section.querySelector('.section-content');
            const headerDiv = section.querySelector('.section-header');
            section.querySelector('.arrow').addEventListener('click', () => toggleSection(headerDiv));

            if (this.selectedObject instanceof Node) {
                const edges = this.store.getEdgesOfNode(this.selectedObject);
                edges.forEach((edge) => {
                    const neighbor = edge.source === this.selectedObject ? edge.target : edge.source; 
                    const arrow = edge.source === this.selectedObject ? '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3C4043"><path d="M400-280v-400l200 200-200 200Z"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3C4043"><path d="M560-280 360-480l200-200v400Z"/></svg>';
                    const neighborDiv = document.createElement('div');
                    neighborDiv.className = 'neighbor';
                    neighborDiv.innerHTML = `
                            <span class="neighbor-type">${edge.label}</span>
                            <span class="neighbor-arrow">${arrow}</span>
                            <span class="neighbor-label" style="background-color: ${this.store.getColorForNode(neighbor)};">${neighbor.label}</span>
                            <span class="neighbor-id">${showNodeKeyProperty(neighbor)}</span>
                    `;
                    sectionContent.appendChild(neighborDiv);

                    neighborDiv.addEventListener('mouseover', () => {
                        this.store.setFocusedObject(neighbor);
                    });

                    neighborDiv.addEventListener('mouseout', () => {
                        this.store.setFocusedObject();
                    });

                    neighborDiv.addEventListener('click', () => {
                        this.store.setSelectedObject(neighbor);
                    });
                });
            }

            if (this.selectedObject instanceof Edge) {
                ['source', 'target'].forEach((neighborType) => {
                    const neighbor = this.selectedObject[neighborType];
                    if (!neighbor) {
                        return;
                    }

                    const neighborTypeLabel = neighborType == 'target' ? 'Destination' : 'Source';

                    const neighborDiv = document.createElement('div');
                    neighborDiv.className = 'neighbor';
                    neighborDiv.innerHTML = `
                            <span class="property-label" style="flex: 1">${neighborTypeLabel}</span>
                            <span class="neighbor-label-wrapper">
                                <span class="neighbor-label" style="background-color: ${this.store.getColorForNode(neighbor)};">${neighbor.label}</span>
                            </span>
                    `;
                    sectionContent.appendChild(neighborDiv);

                    neighborDiv.addEventListener('mouseover', () => {
                        this.store.setFocusedObject(neighbor);
                    });

                    neighborDiv.addEventListener('mouseout', () => {
                        this.store.setFocusedObject();
                    });

                    neighborDiv.addEventListener('click', () => {
                        this.store.setSelectedObject(neighbor);
                    });
                });
            }
        }

        const propertyHtml = (container) => {
            if (!this.selectedObject || !this.selectedObject.properties) {
                return;
            }

            const section = document.createElement('div');
            section.className = 'section';
            section.innerHTML = `
                <div class="section-header">
                    <h3>Properties</h3>
                    <span class="arrow">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3C4043">
                            <path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z"/>
                        </svg>
                    </span>
                </div>
                <div class="section-content"></div>
            `;

            container.appendChild(section);

            const sectionContent = section.querySelector('.section-content');

            function toggleSection(header) {
                const arrow = header.querySelector('.arrow');

                if (sectionContent.style.display === 'none') {
                    sectionContent.style.display = 'block';
                    arrow.innerHTML = `
                    <span class="arrow">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3C4043">
                            <path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z"/>
                        </svg>
                    </span>
                    `; // Down-pointing caret
                } else {
                    sectionContent.style.display = 'none';
                    arrow.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3C4043">
                            <path d="M480-528 296-344l-56-56 240-240 240 240-56 56-184-184Z"/>
                        </svg>
                    `; // Up-pointing caret
                }
            }

            section.querySelector('.arrow').addEventListener('click', () => toggleSection(section.querySelector('.section-header')));

            Object.entries(this.selectedObject.properties).forEach(([property, value]) => {
                const propertyContainer = document.createElement('div');
                propertyContainer.className = 'property';
                propertyContainer.innerHTML = `
                    <div class="property-label">${property}</div>
                    <div class="property-value">${value}</div>
                `;
                sectionContent.appendChild(propertyContainer)
            });
        }

        this.mount.innerHTML = `
        <style>
            .panel {
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 1px 2px rgba(60, 64, 67, 0.3), 0 2px 6px 2px rgba(60, 64, 67, 0.15);
                overflow: hidden;
                width: 360px;
                position: absolute;
                left: 16px;
                top: 96px;
                max-height: calc(100vh - 112px);
                overflow-y: auto;
            }

            .panel-header {
                padding: 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #DADCE0;
            }

            .panel-header h2 {
                margin: 0;
                font-size: 16px;
                font-weight: 400;
            }

            .order-label {
                background-color: #ff5722;
                color: white;
                font-size: 12px;
                padding: 4px 8px;
                border-radius: 4px;
                margin-right: 8px;
                font-weight: 500;
            }

            .count {
                color: #5F6368;
                font-weight: normal;
            }

            .close-btn {
                background: none;
                border: none;
                color: #666;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            }

            .panel-content {
                padding: 16px 16px 0;
            }

            .section {
                margin-bottom: 16px;
            }

            .section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: pointer;
                user-select: none;
                margin-bottom: 12px;
            }

            .section-header h3 {
                margin: 0;
                font-size: 14px;
                font-weight: 600;
                color: #333;
            }

            .arrow {
                font-size: 12px;
                color: #666;
            }

            .section-content {
                margin-top: 8px;
            }

            .property {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-top: 1px solid #DADCE0;
            }

            .property-label {
                color: #202124;
                font-size: 13px;
                font-weight: 600;
            }

            .property-value {
                color: #5F6368;
                font-size: 13px;
                font-weight: 400;
            }

            .neighbor {
                display: flex;
                align-items: center;
                padding: 8px 0;
                border-top: 1px solid #DADCE0;
            }

            .neighbor:hover {
                cursor: pointer;
            }

            .edge-title {
                background-color: white;
                border: 1px solid #DADCE0;
                padding: 4px 8px;
                border-radius: 4px;
                margin-right: 8px;
                font-size: 12px;
                font-weight: bold;
            }

            .neighbor-type {
                background-color: white;
                border: 1px solid #DADCE0;
                color: #3C4043;
                padding: 4px 8px;
                border-radius: 4px;
                margin-right: 8px;
                font-size: 12px;
                font-weight: bold;
            }

            .neighbor-label {
                color: #FFF;
                padding: 4px 8px;
                border-radius: 4px;
                margin-right: 8px;
                font-size: 12px;
                font-weight: bold;
            }

            .neighbor-label-wrapper {
                flex: 1;
                display: flex;
                flex-direction: row-reverse;
            }

            .neighbor-id {
                font-weight: 400;
                color: #333;
                font-size: 13px;
            }

            .neighbor-arrow {
                height: 24px;
                padding: 0;
                border-radius: 4px;
                margin-right: 8px;
            }
        </style>
        <div class="panel">
            ${titleHtml()}
            <div class="panel-content"></div>
        </div>`;

        const titleBtnEl = this.mount.querySelector('#js-close-btn');
        if (titleBtnEl) {
            titleBtnEl.addEventListener('click', () => this.store.setSelectedObject(null));
        }

        const panelContent = this.mount.querySelector('.panel-content');
        if (this.selectedObject instanceof Node) {
            propertyHtml(panelContent);
            neighborHtml(panelContent);
        } else {
            neighborHtml(panelContent);
            propertyHtml(panelContent);
        }
    }

    /**
     * Registers callbacks for GraphStore events.
     * @param {GraphStore} store
     */
    initializeEvents(store) {
        if (!(store instanceof GraphStore)) {
            throw Error('Store must be an instance of GraphStore', store);
        }

        store.addEventListener(GraphStore.EventTypes.SELECT_OBJECT,
            (object, config) => {
                this.neighbors = [];
                this.selectedObject = object;

                if (object instanceof Node) {
                    this.store.getNeighborsOfNode(object).forEach(neighbor => {
                        this.neighbors.push(neighbor);
                    });
                }

                if (object instanceof Edge) {
                    [object.source, object.target].forEach(neighbor => {
                        this.neighbors.push(neighbor);
                    });
                }

                // Clean up sidebar
                this.mount.innerHTML = '';
                this.mount.textContent = '';
                this.constructSidebar();
            });
    }

    onSelectedObjectChanged(object) {
        if (!object) {
            return;
        }

        this.elements.sidebarHeader.textContent = object.label ? object.label : 'Unlabeled';

        if (!object.properties) {
            return;
        }

        this.elements.nodeProperties.style.display = 'block';

        for (const [label, value] of Object.entries(object.properties)) {
            this.elements.nodePropertyList.appendChild(this.createPropertyItem(label, value));
        }
    }

    createPropertyItem(label, value) {
        const item = document.createElement('li');
        item.className = 'property-item';
        item.innerHTML = `
            <div class="property-label">${label}</div>
            <div class="property-value-container">
                <div class="property-value">${value}</div>
                <button class="copy-button" onclick="copyToClipboard('${value}')" title="Copy to clipboard">
                    <svg class="copy-icon" viewBox="0 0 24 24">
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                    </svg>
                </button>
            </div>
        `;
        return item;
    }

    populateNodeProperties() {
        if (!this.selectedObject) {
            return;
        }

        this.elements.nodeType.textContent =
            this.selectedObject.label ? this.selectedObject.label : 'Unlabeled Node';

        if (!this.selectedObject.properties) {
            return;
        }

        for (const [label, value] of Object.entries(this.selectedObject.properties)) {
            this.elements.nodePropertyList.appendChild(this.createPropertyItem(label, value));
        }
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            console.log('Copied to clipboard');
        }, (err) => {
            console.error('Could not copy text: ', err);
        });
    }
}

window[namespace].Sidebar = Sidebar;
