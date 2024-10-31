import unittest

from spanner_graphs.schema_manager import SchemaManager
from  spanner_graphs.graph_entities import Node, Edge

class TestSchemaManager(unittest.TestCase):
    def setUp(self):
        self.sample_schema = {
            "nodeTables": [
                {
                    "name": "Person",
                    "labelNames": ["Person"],
                    "keyColumns": ["id"],
                     "propertyDefinitions": [
                        {
                            "propertyDeclarationName": "id",
                            "valueExpressionSql": "id"
                        }
                     ]
                },
                {
                    "name": "Account",
                    "labelNames": ["Account"],
                    "keyColumns": ["account_id"],
                    "propertyDefinitions": [
                        {
                            "propertyDeclarationName": "id",
                            "valueExpressionSql": "id"
                        }
                     ]
                },
                {
                    "name": "BankAccount",
                    "labelNames": ["Account"],
                    "keyColumns": ["id"],
                    "propertyDefinitions": [
                        {
                            "propertyDeclarationName": "id",
                            "valueExpressionSql": "id"
                        }
                     ]
                },
                {
                    "name": "People",
                    "labelNames": ["Person", "Human"],
                    "keyColumns": ["id"],
                    "propertyDefinitions": [
                        {
                            "propertyDeclarationName": "id",
                            "valueExpressionSql": "id"
                        }
                     ]
                }
            ]
        }
        self.schema_manager = SchemaManager(self.sample_schema)

    def test_unique_node_labels(self):
        self.assertEqual(self.schema_manager.unique_node_labels, {"Person"})

    def test_get_unique_node_key_property_names(self):
        item = {
            "identifier": "1",
            "labels": ["Person"],
            "properties": {
                "type": "Current"
            },
        }

        node = Node.from_json(item)
        propert_names = self.schema_manager.get_key_property_names(node)
        self.assertEqual(propert_names, ["id"])

    def test_get_non_unique_node_key_property_names(self):
        item = {
            "identifier": "1",
            "labels": ["Account"],
            "properties": {
                "type": "Current"
            },
        }

        node = Node.from_json(item)
        property_names = self.schema_manager.get_key_property_names(node)
        self.assertEqual(property_names, [])

    def test_non_existing_node(self):
        item = {
            "identifier": "1",
            "labels": ["NoneExisting"],
            "properties": {
                "type": "Current"
            },
        }
        node = Node.from_json(item)
        property_names = self.schema_manager.get_key_property_names(node)
        self.assertEqual(property_names, [])

    def test_type_error(self):
        with self.assertRaises(TypeError):
            self.schema_manager.get_key_property_names("NotANode")
