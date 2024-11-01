# Copyright 2024 Google LLC
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
