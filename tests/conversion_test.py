# Copyright 2024 Google LLC

# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at

#     https://www.apache.org/licenses/LICENSE-2.0

# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
This module tests the conversion file in `spanner_graph/conversion.py`
"""

from __future__ import annotations
import unittest
import numpy as np

from google.cloud.spanner_v1.types import TypeCode, StructType, Type
from spanner_graphs.conversion import (_column_to_native_numpy,
                                       columns_to_native_numpy,
                                       prepare_data_for_graphing, SizeMode)

NODE_DEGREE = "value"


class TestConversion(unittest.TestCase):
    """
    Test class for conversion implementation
    """

    def test_column_to_native_numpy_json(self) -> None:
        """
        Test case where each column item is a single JSON object
        """
        column_data = ['{"key": "value"}', '{"key": "value2"}']
        result = _column_to_native_numpy(column_data, TypeCode.JSON)

        self.assertIsInstance(result, np.ndarray)
        self.assertEqual(result[0], {"key": "value"})
        self.assertEqual(result[1], {"key": "value2"})

    def test_column_to_native_numpy_json_array(self) -> None:
        """
        Test case where each column item is an Array of JSON objects
        """
        column_data = [[
            '{"key": "value1", "key2": "value2"}',
            '{"key": "value3", "key2": "value4"}',
        ]]

        datatype = TypeCode.ARRAY
        array_type = TypeCode.JSON
        result = _column_to_native_numpy(column_data, datatype, array_type)

        self.assertIsInstance(result, np.ndarray)
        self.assertIsInstance(result[0], np.ndarray)
        self.assertEqual(result[0][0], {"key": "value1", "key2": "value2"})
        self.assertEqual(result[0][1], {"key": "value3", "key2": "value4"})

    def test_column_to_native_numpy_invalid_type(self) -> None:
        """
        Test case to assert that a ValueError is thrown for
        non-supported column types
        """

        column_data = ["test", "example"]

        regex = "Only JSON and array of JSON are allowed"
        with self.assertRaisesRegex(ValueError, regex):
            _column_to_native_numpy(column_data, TypeCode.STRING)

    def test_columns_to_native_numpy(self) -> None:
        """
        Test case for proper handling of multiple columns and that no
        columns are ignored
        """

        data = dict([("col1", ['{"key": "value"}']), ("col2", [2.3215])])

        fields = [
            StructType.Field(name="col1", type_=Type(code=TypeCode.JSON)),
            StructType.Field(name="col2", type_=Type(code=TypeCode.FLOAT64)),
        ]

        result, ignored_columns = columns_to_native_numpy(data, fields)

        self.assertIsInstance(result["col1"], np.ndarray)
        self.assertEqual(result["col1"][0], {"key": "value"})

        self.assertEqual(len(ignored_columns), 1)
        self.assertIn("col2", ignored_columns)

    def test_prepare_data_for_graphing(self) -> None:
        """
        This method validates that the output from column conversions
        which may contain duplicates are put in a set and the list returned
        contains no duplicate items and a flattened list of json values
        are returned.
        """

        # pylint: disable=line-too-long
        data = {
            "col1": [
                '{"kind": "node", "identifier": "1", "labels": ["Person"], "properties": {"name": "Emmanuel"}}',
                '{"kind": "node", "identifier": "2", "labels": ["Person"], "properties": {"name": "Will"}}',
                '{"kind": "node", "identifier": "2", "labels": ["Person"], "properties": {"name": "Will"}}',
                '{"kind": "edge", "identifier": "a", "source_node_identifier": "1", "destination_node_identifier": "2", "labels": ["KNOWS"], "properties": {"since": "2020", "weight": 0.1}}',
                '{"kind": "edge", "identifier": "a", "source_node_identifier": "1", "destination_node_identifier": "2", "labels": ["KNOWS"], "properties": {"since": "2020", "weight": 0.1}}',
                '{"kind": "edge", "identifier": "b", "source_node_identifier": "1", "destination_node_identifier": "2", "labels": ["KNOWS"], "properties": {"since": "2021", "weight": 0.7}}',
            ]
        }

        fields = [
            StructType.Field(name="col1", type_=Type(code=TypeCode.JSON))
        ]

        output, _ = columns_to_native_numpy(data, fields)
        graph = prepare_data_for_graphing(output, None, True)

        # Test nodes
        self.assertEqual(len(graph.nodes), 2)  # tests duplicates
        self.assertIn(1, graph.nodes)
        self.assertIn(2, graph.nodes)

        # Test node properties
        self.assertEqual(graph.nodes[1]["label"], "Person")
        self.assertEqual(graph.nodes[2]["label"], "Person")

        # Test edges with keys being the edge identifier
        self.assertEqual(len(graph.edges), 2)
        self.assertIn((1, 2, "a"), graph.edges)
        self.assertIn((1, 2, "b"), graph.edges)

        # Test node sizing rules. Defaults to Cardinality
        # in-degree(0) + out-degree(1)
        self.assertEqual(graph.nodes[1][NODE_DEGREE], 2)
        # in-degree(1) + out-degree(0)
        self.assertEqual(graph.nodes[2][NODE_DEGREE], 2)

        # Cardinality sizing
        graph = prepare_data_for_graphing(output,
                                          None,
                                          True,
                                          size_mode=SizeMode.CARDINALITY)
        self.assertEqual(graph.nodes[1][NODE_DEGREE], 2)
        self.assertEqual(graph.nodes[2][NODE_DEGREE], 2)

        # Static sizing
        graph = prepare_data_for_graphing(output,
                                          None,
                                          True,
                                          size_mode=SizeMode.STATIC)
        self.assertEqual(hasattr(graph.nodes[1], NODE_DEGREE), False)
        self.assertEqual(hasattr(graph.nodes[2], NODE_DEGREE), False)


if __name__ == "__main__":
    unittest.main()
