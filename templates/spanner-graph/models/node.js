/**
 * Represents a graph node.
 * @class
 */
class Node extends GraphObject {
    /**
     * Arbitrary value
     * @type {number}
     */
    value;

    /**
     * The numeric value associated with the node.
     * @type {number}
     */
    id;

    /**
     * The numeric value associated with the neighborhood.
     * This may be used by the visualization implementation for clustering.
     * @type {number}
     */
    neighborhood = 0;

    color = '#ec0001'

    /**
    * A node on the graph
    *
    * @param {Object} params
    * @param {string} params.label - The label for the edge.
    * @param {string|Object} params.title - The optional property:value map for the edge.
    * @param {string} params.color - The color of the edge
    * @extends GraphObject
    */
    constructor({ label, title, properties, value, id, neighborhood, color, key_property_names }) {
        super({ label, title, properties, key_property_names });

        if (typeof id != 'number') {
            this.instantiationErrorReason = "Node does not have an ID";
            console.error(this.instantiationErrorReason, { label, title, value, id });
            return;
        }

        this.id = id;
        this.value = value;
        this.instantiated = true;
        this.neighborhood = typeof neighborhood === 'number' ? neighborhood : 0;
        this.color = color;
    }
}

window[namespace].Node = Node;
