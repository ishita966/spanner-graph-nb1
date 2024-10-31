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
This module contains implementation for talking to spanner database
via snapshot queries.
"""

from __future__ import annotations
from typing import Any, Dict, List, Tuple
import json
import os
import csv

from google.cloud import spanner
from google.cloud.spanner_v1.types import StructType, TypeCode, Type


class SpannerDatabase:
    """The spanner class holding the database connection"""
    def __init__(self, project_id: str, instance_id: str,
                 database_id: str) -> None:
        self.client = spanner.Client(project=project_id)
        self.instance = self.client.instance(instance_id)
        self.database = self.instance.database(database_id)

        # In order to ensure that the database connection was properly
        # created and that customers won't be confused by connectivity
        # errors happening mysteriously, let's firstly run a dummy
        # query on the database.
        sql = 'SELECT table_name FROM information_schema.tables WHERE table_schema = ""'
        _ = self.execute_query(sql, None, is_test_query=True)

    def __repr__(self) -> str:
        return (f"<SpannerDatabase["
                f"project:{self.client.project_name},"
                f"instance{self.instance.name},"
                f"db:{self.database.name}]")

    def _extract_graph_name(self, query: str) -> str:
        words = query.strip().split()
        if len(words) < 3:
            raise ValueError("invalid query: must contain at least (GRAPH, graph_name and query)")

        if words[0].upper() != "GRAPH":
            raise ValueError("invalid query: GRAPH must be the first word")

        return words[1]

    def _get_schema_for_graph(self, graph_query: str):
        try:
            graph_name = self._extract_graph_name(graph_query)
        except ValueError as e:
            print(f"Error extracting graph name: {str(e)}")
            return None

        with self.database.snapshot() as snapshot:
            schema_query = """
            SELECT property_graph_name, property_graph_metadata_json
            FROM information_schema.property_graphs
            WHERE property_graph_name = @graph_name
            """
            params = {"graph_name": graph_name}
            param_type = {"graph_name": spanner.param_types.STRING}

            result = snapshot.execute_sql(schema_query, params=params, param_types=param_type)
            schema_rows = list(result)

            if schema_rows:
                return schema_rows[0][1]
            else:
                print(f"No schema found for graph: {graph_name}")
                return None

    def execute_query(
        self,
        query: str,
        limit: int = None,
        is_test_query: bool = False,
    ):
        """
        This method executes the provided `query`

        Args:
            query: The SQL query to execute against the database
            limit: An optional limit for the number of rows to return

        Returns:
            A tuple containing:
            - Dict[str, List[Any]]: A dict where each key is a field name
            returned in the query and the list contains all items of the same
            type found for the given field.
            - A list of StructType.Fields representing the fields in the result set.
            - A list of rows as returned by the query execution.
        """
        self.schema_json = None
        if not is_test_query:
            self.schema_json = self._get_schema_for_graph(query)

        with self.database.snapshot() as snapshot:
            params = None
            if limit and limit > 0:
                params = dict(limit=limit)

            results = snapshot.execute_sql(query, params=params)
            rows = list(results)
            fields: List[StructType.Field] = results.fields

            data = {field.name: [] for field in fields}

            if len(fields) == 0:
                return data, fields, rows

            for row in rows:
                for field, value in zip(fields, row):
                    data[field.name].append(value)

            return data, fields, rows, self.schema_json


class MockSpannerResult:

    def __init__(self, file_path: str):
        self.file_path = file_path
        self.fields: List[StructType] = []
        self._rows: List[List[Any]] = []
        self._load_data()

    def _load_data(self):
        with open(self.file_path, "r", encoding="utf-8") as csvfile:
            csv_reader = csv.reader(csvfile)
            headers = next(csv_reader)
            self.fields = [
                StructType.Field(name=header, type_=Type(code=TypeCode.JSON))
                for header in headers
            ]

            for row in csv_reader:
                parsed_row = []
                for value in row:
                    try:
                        js = bytes(value, "utf-8").decode("unicode_escape")
                        parsed_row.append(json.loads(js))
                    except json.JSONDecodeError:
                        pass
                self._rows.append(parsed_row)

    def __iter__(self):
        return iter(self._rows)


class MockSpannerDatabase:
    """Mock database class"""

    def __init__(self):
        dirname = os.path.dirname(__file__)
        self.graph_csv_path = os.path.join(
                            dirname, "graph_mock_data.csv")
        self.schema_json_path = os.path.join(
                            dirname, "graph_mock_schema.json")
        self.schema_json: dict = {}

    def execute_query(
        self,
        _: str,
        limit: int = None
    ) -> Tuple[Dict[str, List[Any]], List[StructType.Field], List, str]:
        """Mock execution of query"""

        # Before the actual query we fetch the schema as well
        with open(self.schema_json_path, "r", encoding="utf-8") as js:
            self.schema_json = json.load(js)

        results = MockSpannerResult(self.graph_csv_path)
        fields: List[StructType.Field] = results.fields
        rows = list(results)
        data = {field.name: [] for field in fields}

        if len(fields) == 0:
            return data, fields, rows

        for i, row in enumerate(results):
            if limit is not None and i >= limit:
                break
            for field, value in zip(fields, row):
                data[field.name].append(value)

        return data, fields, rows, self.schema_json
