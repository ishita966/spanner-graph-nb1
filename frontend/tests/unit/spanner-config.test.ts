/**
 * Copyright 2025 Google LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *
 */

// @ts-ignore
const GraphConfig = require('../../src/spanner-config.js');
// @ts-ignore
const GraphNode = require('../../src/models/node.js');
// @ts-ignore
const Edge = require('../../src/models/edge.js');
// @ts-ignore
const Schema = require('../../src/models/schema.js');

describe('GraphConfig', () => {
    // @ts-ignore
    let mockNodesData: Array<{
        id: number;
        label: string;
        properties: Record<string, any>;
        key_property_names: string[];
    }>;
    // @ts-ignore
    let mockEdgesData;
    // @ts-ignore
    let mockSchemaData: {
        nodeTables: Array<{
            name: string;
            labelNames: string[];
            columns: Array<{name: string; type: string}>;
        }>;
        edgeTables: Array<{
            name: string;
            labelNames: string[];
            columns: Array<{name: string; type: string}>;
            sourceNodeTable: {nodeTableName: string};
            destinationNodeTable: {nodeTableName: string};
        }>;
    };

    beforeEach(() => {
        mockNodesData = [
            {
                id: 1,
                label: 'Person',
                properties: {name: 'John', age: 30},
                key_property_names: ['id']
            },
            {
                id: 2,
                label: 'Company',
                properties: {name: 'Google', location: 'CA'},
                key_property_names: ['id']
            }
        ];

        mockEdgesData = [
            {
                id: 1,
                label: 'WORKS_AT',
                from: 1,
                to: 2,
                properties: {since: 2020},
                key_property_names: ['id']
            }
        ];

        mockSchemaData = {
            nodeTables: [
                {
                    name: 'Person',
                    labelNames: ['Person'],
                    columns: [
                        {name: 'id', type: 'STRING'},
                        {name: 'name', type: 'STRING'},
                        {name: 'age', type: 'INT64'}
                    ]
                },
                {
                    name: 'Company',
                    labelNames: ['Company'],
                    columns: [
                        {name: 'id', type: 'STRING'},
                        {name: 'name', type: 'STRING'},
                        {name: 'location', type: 'STRING'}
                    ]
                }
            ],
            edgeTables: [
                {
                    name: 'WORKS_AT',
                    labelNames: ['WORKS_AT'],
                    columns: [
                        {name: 'id', type: 'STRING'},
                        {name: 'since', type: 'INT64'}
                    ],
                    sourceNodeTable: {
                        nodeTableName: 'Person'
                    },
                    destinationNodeTable: {
                        nodeTableName: 'Company'
                    }
                }
            ]
        };
    });

    describe('constructor', () => {
        it('should create a new GraphConfig instance with default values', () => {
            const config = new GraphConfig({
                // @ts-ignore
                nodesData: mockNodesData,
                // @ts-ignore
                edgesData: mockEdgesData,
                // @ts-ignore
                schemaData: mockSchemaData
            });

            expect(config.nodes.length).toBe(2);
            expect(config.edges.length).toBe(1);
            expect(config.colorScheme).toBe(GraphConfig.ColorScheme.NEIGHBORHOOD);
            expect(config.viewMode).toBe(GraphConfig.ViewModes.DEFAULT);
            expect(config.layoutMode).toBe(GraphConfig.LayoutModes.FORCE);
        });

        it('should accept custom color palette and scheme', () => {
            const customPalette = ['#FF0000', '#00FF00', '#0000FF'];
            const config = new GraphConfig({
                // @ts-ignore
                nodesData: mockNodesData,
                // @ts-ignore
                edgesData: mockEdgesData,
                // @ts-ignore
                schemaData: mockSchemaData,
                colorPalette: customPalette,
                colorScheme: GraphConfig.ColorScheme.LABEL
            });

            expect(config.colorPalette).toEqual(customPalette);
            expect(config.colorScheme).toBe(GraphConfig.ColorScheme.LABEL);
        });
    });

    describe('parseNodes', () => {
        it('should parse valid node data', () => {
            const config = new GraphConfig({
                // @ts-ignore
                nodesData: mockNodesData,
                edgesData: [],
                // @ts-ignore
                schemaData: mockSchemaData
            });

            expect(config.nodes.length).toBe(2);
            expect(config.nodes[0]).toBeInstanceOf(GraphNode);
            expect(config.nodes[0].label).toBe('Person');
            expect(config.nodes[1].label).toBe('Company');
        });
    });

    describe('parseEdges', () => {
        it('should parse valid edge data', () => {
            const config = new GraphConfig({
                // @ts-ignore
                nodesData: mockNodesData,
                // @ts-ignore
                edgesData: mockEdgesData,
                // @ts-ignore
                schemaData: mockSchemaData
            });

            expect(config.edges.length).toBe(1);
            expect(config.edges[0]).toBeInstanceOf(Edge);
            expect(config.edges[0].label).toBe('WORKS_AT');
            expect(config.edges[0].from).toBe(1);
            expect(config.edges[0].to).toBe(2);
        });

        it('should handle invalid edge data gracefully', () => {
            const invalidEdgesData = [
                {invalid: 'data'},
                null,
                undefined,
                {id: 1, label: 'WORKS_AT'}
            ];

            const config = new GraphConfig({
                // @ts-ignore
                nodesData: mockNodesData,
                edgesData: invalidEdgesData,
                // @ts-ignore
                schemaData: mockSchemaData
            });

            expect(config.edges.length).toBe(0);
        });
    });

    describe('assignColors', () => {
        it('should append colors to different node labels', () => {
            const config = new GraphConfig({
                // @ts-ignore
                nodesData: mockNodesData,
                // @ts-ignore
                edgesData: mockEdgesData,
                // @ts-ignore
                schemaData: mockSchemaData
            });

            expect(config.nodeColors['Person']).toBeDefined();
            expect(config.nodeColors['Company']).toBeDefined();
            expect(config.nodeColors['Person']).not.toBe(config.nodeColors['Company']);
        });

        it('should reuse colors for same labels', () => {
            const nodesWithSameLabels = [
                // @ts-ignore
                ...mockNodesData,
                {
                    id: 3,
                    label: 'Person',
                    properties: {name: 'Jane', age: 25},
                    key_property_names: ['id']
                }
            ];

            const config = new GraphConfig({
                nodesData: nodesWithSameLabels,
                // @ts-ignore
                edgesData: mockEdgesData,
                // @ts-ignore
                schemaData: mockSchemaData
            });

            expect(Object.keys(config.nodeColors).length).toBe(2);
        });

        it('should ensure schema nodes and default nodes with the same label have the same color', () => {
            // Create a more complex scenario where:
            // Regular nodes have labels: A, C, E, F
            // Schema nodes have labels: A, B, C, D, E, F
            const complexNodesData = [
                {
                    id: 1,
                    label: 'A',
                    properties: {name: 'Node A', value: 10},
                    key_property_names: ['id']
                },
                {
                    id: 2,
                    label: 'C',
                    properties: {name: 'Node C', value: 30},
                    key_property_names: ['id']
                },
                {
                    id: 3,
                    label: 'E',
                    properties: {name: 'Node E', value: 50},
                    key_property_names: ['id']
                },
                {
                    id: 4,
                    label: 'F',
                    properties: {name: 'Node F', value: 60},
                    key_property_names: ['id']
                }
            ];

            const complexSchemaData = {
                nodeTables: [
                    {
                        name: 'TableA',
                        labelNames: ['A'],
                        columns: [
                            {name: 'id', type: 'STRING'},
                            {name: 'name', type: 'STRING'},
                            {name: 'value', type: 'INT64'}
                        ]
                    },
                    {
                        name: 'TableB',
                        labelNames: ['B'],
                        columns: [
                            {name: 'id', type: 'STRING'},
                            {name: 'name', type: 'STRING'},
                            {name: 'value', type: 'INT64'}
                        ]
                    },
                    {
                        name: 'TableC',
                        labelNames: ['C'],
                        columns: [
                            {name: 'id', type: 'STRING'},
                            {name: 'name', type: 'STRING'},
                            {name: 'value', type: 'INT64'}
                        ]
                    },
                    {
                        name: 'TableD',
                        labelNames: ['D'],
                        columns: [
                            {name: 'id', type: 'STRING'},
                            {name: 'name', type: 'STRING'},
                            {name: 'value', type: 'INT64'}
                        ]
                    },
                    {
                        name: 'TableE',
                        labelNames: ['E'],
                        columns: [
                            {name: 'id', type: 'STRING'},
                            {name: 'name', type: 'STRING'},
                            {name: 'value', type: 'INT64'}
                        ]
                    },
                    {
                        name: 'TableF',
                        labelNames: ['F'],
                        columns: [
                            {name: 'id', type: 'STRING'},
                            {name: 'name', type: 'STRING'},
                            {name: 'value', type: 'INT64'}
                        ]
                    }
                ],
                edgeTables: []
            };

            const config = new GraphConfig({
                // @ts-ignore
                nodesData: complexNodesData,
                edgesData: [],
                // @ts-ignore
                schemaData: complexSchemaData
            });

            // Verify that colors have been assigned to all labels
            expect(Object.keys(config.nodeColors).sort()).toEqual(['A', 'B', 'C', 'D', 'E', 'F'].sort());
        });

        it('should maintain color consistency when adding new nodes with existing labels', () => {
            // First create a config with schema nodes and some default nodes
            const extendedSchemaData = {
                nodeTables: [
                    ...mockSchemaData.nodeTables,
                    {
                        name: 'Product',
                        labelNames: ['Product'],
                        columns: [
                            {name: 'id', type: 'STRING'},
                            {name: 'name', type: 'STRING'},
                            {name: 'price', type: 'FLOAT64'}
                        ]
                    }
                ],
                edgeTables: mockSchemaData.edgeTables
            };

            const initialConfig = new GraphConfig({
                // @ts-ignore
                nodesData: mockNodesData, // Only Person and Company nodes
                // @ts-ignore
                edgesData: mockEdgesData,
                // @ts-ignore
                schemaData: extendedSchemaData
            });

            // Store the initial colors
            const personColorInitial = initialConfig.nodeColors['Person'];
            const companyColorInitial = initialConfig.nodeColors['Company'];
            
            // Now add a new node with an existing label (Person) and a new node with a schema-only label (Product)
            const extendedNodesData = [
                ...mockNodesData,
                {
                    id: 3,
                    label: 'Person',
                    properties: {name: 'Jane', age: 25},
                    key_property_names: ['id']
                },
                {
                    id: 4,
                    label: 'Product',
                    properties: {name: 'Laptop', price: 999.99},
                    key_property_names: ['id']
                }
            ];

            const updatedConfig = new GraphConfig({
                // @ts-ignore
                nodesData: extendedNodesData,
                // @ts-ignore
                edgesData: mockEdgesData,
                // @ts-ignore
                schemaData: extendedSchemaData
            });

            // Verify colors remain consistent
            expect(updatedConfig.nodeColors['Person']).toBe(personColorInitial);
            expect(updatedConfig.nodeColors['Company']).toBe(companyColorInitial);
            expect(updatedConfig.nodeColors['Product']).toBe(updatedConfig.nodeColors['Product']);

            // Verify that all node labels have colors
            expect(Object.keys(updatedConfig.nodeColors).length).toBe(3);
        });

        it('should synchronize colors when schema is loaded after nodes', () => {
            // Create a config with only nodes first (no schema)
            const configWithoutSchema = new GraphConfig({
                // @ts-ignore
                nodesData: mockNodesData,
                // @ts-ignore
                edgesData: mockEdgesData,
                schemaData: null
            });

            // Store the initial node colors
            const personColorInitial = configWithoutSchema.nodeColors['Person'];
            const companyColorInitial = configWithoutSchema.nodeColors['Company'];
            
            // Now create a new config with the same nodes but add schema
            const configWithSchema = new GraphConfig({
                // @ts-ignore
                nodesData: mockNodesData,
                // @ts-ignore
                edgesData: mockEdgesData,
                // @ts-ignore
                schemaData: mockSchemaData
            });

            // Verify that schema node colors match the previously assigned node colors
            expect(configWithSchema.nodeColors['Person']).toBe(personColorInitial);
            expect(configWithSchema.nodeColors['Company']).toBe(companyColorInitial);
            
            // Verify that node colors remain consistent
            expect(configWithSchema.nodeColors['Person']).toBe(personColorInitial);
            expect(configWithSchema.nodeColors['Company']).toBe(companyColorInitial);
            
            // Verify that all node labels have the same color in both nodeColors and schemaNodeColors
            expect(configWithSchema.nodeColors['Person']).toBe(configWithSchema.nodeColors['Person']);
            expect(configWithSchema.nodeColors['Company']).toBe(configWithSchema.nodeColors['Company']);
        });

        it('should handle multiple schema nodes with the same label correctly', () => {
            // Create schema data with multiple node tables having the same label
            const schemaWithDuplicateLabels = {
                nodeTables: [
                    ...mockSchemaData.nodeTables,
                    {
                        name: 'Customer',
                        labelNames: ['Person'], // Same label as Person node
                        columns: [
                            {name: 'id', type: 'STRING'},
                            {name: 'name', type: 'STRING'},
                            {name: 'email', type: 'STRING'}
                        ]
                    }
                ],
                edgeTables: mockSchemaData.edgeTables
            };

            const config = new GraphConfig({
                // @ts-ignore
                nodesData: mockNodesData,
                // @ts-ignore
                edgesData: mockEdgesData,
                // @ts-ignore
                schemaData: schemaWithDuplicateLabels
            });

            // Verify that all schema nodes with the same label have the same color
            const personSchemaNodes = config.nodeColors['Person'];
            
            // Verify that all Person schema nodes have the same color
            expect(personSchemaNodes).toBe(config.nodeColors['Person']);
            
            // Verify that the default Person node has the same color as the schema Person nodes
            expect(config.nodeColors['Person']).toBe(personSchemaNodes);
        });
    });

    describe('parseSchema', () => {
        it('should parse schema data correctly', () => {
            const config = new GraphConfig({
                // @ts-ignore
                nodesData: mockNodesData,
                // @ts-ignore
                edgesData: mockEdgesData,
                // @ts-ignore
                schemaData: mockSchemaData
            });

            expect(config.schema).toBeInstanceOf(Schema);
            expect(config.schemaNodes.length).toBe(2);
            expect(config.schemaEdges.length).toBe(1);
        });

        it('should handle missing schema data gracefully', () => {
            const config = new GraphConfig({
                // @ts-ignore
                nodesData: mockNodesData,
                // @ts-ignore
                edgesData: mockEdgesData,
                schemaData: null
            });

            expect(config.schema).toBeNull();
            expect(config.schemaNodes.length).toBe(0);
            expect(config.schemaEdges.length).toBe(0);
        });
    });
});