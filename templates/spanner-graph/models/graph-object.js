class GraphObject {
    /**
     * The label of the Graph Object.
     * @type {string}
     */
    label;

    /**
     * A map of properties and their values describing the Graph Ebject.
     * @type {{[key: string]: string}}
     */
    properties = {};

    /**
     * A boolean indicating if the Graph Object object has been instantiated.
     * @type {boolean}
     */
    instantiated = false;

    /**
     * The key property names for the graph element determines what keys in the properties
     * are to be displayed.
     * @type {string[]}
     */
    key_property_names = [];

    /**
     * The reason for the instantiation error.
     * @type {string}
     */
    instantiationErrorReason;


    /**
     * An object that renders on the graph.
     *
     * @param {Object} params
     * @param {string} params.label - The label for the object.
     * @param {Object} params.properties - The optional property:value map for the object.
     */
    constructor({ label, properties, key_property_names }) {
        this.label = label;
        this.properties = properties;
        this.key_property_names = key_property_names;
        this.instantiated = true;
    }
}

window[namespace].GraphObject = GraphObject;
