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

"""Magic class for our visualization"""

import argparse
import base64
from enum import Enum, auto
import json
import os
import sys
from IPython.core.magic import Magics, magics_class, cell_magic
from IPython.display import display, clear_output, IFrame
from networkx import DiGraph
import ipywidgets as widgets
from ipywidgets import interact
from jinja2 import Template

from spanner_graphs.conversion import (columns_to_native_numpy,
                                       prepare_data_for_graphing, SizeMode)

from spanner_graphs.database import SpannerDatabase, MockSpannerDatabase


def _load_file(path: list[str]) -> str:
        file_path = os.path.sep.join(path)
        if not os.path.exists(file_path):
                raise FileNotFoundError(f"Template file not found: {file_path}")

        with open(file_path, 'r') as file:
                content = file.read()

        return content

def _load_image(path: list[str]) -> str:
    file_path = os.path.sep.join(path)
    if not os.path.exists(file_path):
        print("image does not exist")
        return ''

    if file_path.lower().endswith('.svg'):
        with open(file_path, 'r') as file:
            svg = file.read()
            return base64.b64encode(svg.encode('utf-8')).decode('utf-8')
    else:
        with open(file_path, 'rb') as file:
            return base64.b64decode(file.read()).decode('utf-8')

def _generate_html(graph: DiGraph, rows, schema):
        if not isinstance(rows, list):
            rows = []

        # Get the directory of the current file (magics.py)
        current_dir = os.path.dirname(os.path.abspath(__file__))

        # Go up directories until we find the 'templates' folder
        search_dir = current_dir
        while 'templates' not in os.listdir(search_dir):
            parent = os.path.dirname(search_dir)
            if parent == search_dir:  # We've reached the root directory after I updated
                raise FileNotFoundError("Could not find 'templates' directory")
            search_dir = parent

        # Retrieve the javascript content
        template_content = _load_file([search_dir, 'templates', 'template-spannergraph.html'])
        schema_content = _load_file([search_dir, 'templates', 'spanner-graph', 'models', 'schema.js'])
        graph_object_content = _load_file([search_dir, 'templates', 'spanner-graph', 'models', 'graph-object.js'])
        node_content = _load_file([search_dir, 'templates', 'spanner-graph', 'models', 'node.js'])
        edge_content = _load_file([search_dir, 'templates', 'spanner-graph', 'models', 'edge.js'])
        config_content = _load_file([search_dir, 'templates', 'spanner-graph', 'spanner-config.js'])
        store_content = _load_file([search_dir, 'templates', 'spanner-graph', 'spanner-store.js'])
        graph_content = _load_file([search_dir, 'templates', 'spanner-graph', 'visualization', 'spanner-forcegraph.js'])
        sidebar_content = _load_file([search_dir, 'templates', 'spanner-graph', 'visualization', 'spanner-sidebar.js'])

        # Retrieve image content
        graph_background_image = _load_image([search_dir, "templates", "assets", "images", "graph-bg.svg"])

        # Create a Jinja2 template
        template = Template(template_content)

        nodes = []
        for (node_id, node) in graph.nodes(data=True):
            nodes.append(node)

        edges = []
        for (from_id, to_id, edge) in graph.edges(data=True):
            edges.append(edge)

        # Render the template with the graph data and JavaScript content
        html_content = template.render(
            graph_background_image=graph_background_image,
            template_content=template_content,
            schema_content=schema_content,
            graph_object_content=graph_object_content,
            node_content=node_content,
            edge_content=edge_content,
            config_content=config_content,
            graph_content=graph_content,
            store_content=store_content,
            sidebar_content=sidebar_content,
            nodes=nodes,
            edges=edges,
            rows=rows,
            schema=schema
        )

        return html_content


def _parse_element_display(element_rep: str) -> dict[str, str]:
    """Helper function to parse element display fields into a dict."""
    if not element_rep:
        return {}
    res = {
        e.strip().split(":")[0].lower(): e.strip().split(":")[1]
        for e in element_rep.strip().split(",")
    }
    return res


@magics_class
class NetworkVisualizationMagics(Magics):
    """Network visualizer with Networkx"""

    def __init__(self, shell):
        super().__init__(shell)
        self.database = None
        self.limit = 5
        self.args = None
        self.cell = None

    def visualize(self, limit):
        """Helper function to create and display the visualization"""
        query_result, fields, rows, schema_json = self.database.execute_query(self.cell, limit)
        d, ignored_columns = columns_to_native_numpy(query_result, fields)


        graph: DiGraph = prepare_data_for_graphing(
            incoming=d,
            schema_json=schema_json)

        if len(ignored_columns) > 0:
            print(f"Some returned fields are not graph "
                  f"element JSON type, so they are not "
                  f"visualized below: {', '.join(ignored_columns)}")

        # Generate the HTML content
        html_content = _generate_html(graph, rows, schema_json)

        # Encode the HTML content
        encoded_content = base64.b64encode(html_content.encode()).decode()
        data_uri = f"data:text/html;base64,{encoded_content}"

        display(IFrame(src=data_uri, width="100%", height="700px"))

    @cell_magic
    def spanner_graph(self, line: str, cell: str):
        """spanner_graph function"""
        parser = argparse.ArgumentParser(
            description="Visualize network from Spanner database")
        parser.add_argument("--project", help="GCP project ID")
        parser.add_argument("--instance",
                            help="Spanner instance ID")
        parser.add_argument("--database",
                            help="Spanner database ID")
        parser.add_argument("--mock",
                            action="store_true",
                            help="Use mock database")

        args = parser.parse_args(line.split())
        if not args.mock:
            if not (args.project and args.instance and args.database):
                raise ValueError(
                    "Please provide `--project`, `--instance`, "
                    "and `--database` values for your query.")

        try:
            self.args = parser.parse_args(line.split())
            self.cell = cell

            if self.args.mock:
                self.database = MockSpannerDatabase()
            else:
                self.database = SpannerDatabase(self.args.project,
                                                self.args.instance,
                                                self.args.database)

            clear_output(wait=True)
            self.visualize(self.limit)
        except ValueError as e:
            print(f"Error: {e}")
            print("Usage: %%spanner_graph_viz --project PROJECT_ID "
                  "--instance INSTANCE_ID --database DATABASE_ID "
                  "[--mock] ")
            print("     SELECT ... you query here ...")


def load_ipython_extension(ipython):
    """Registration function"""
    ipython.register_magics(NetworkVisualizationMagics)
