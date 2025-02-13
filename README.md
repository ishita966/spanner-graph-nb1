# Spanner Graph Notebook: Explore Your Data Visually


The Spanner Graph Notebook tool lets you visually query [Spanner Graph](https://cloud.google.com/spanner/docs/graph/overview) in a notebook environment (e.g. [Google Colab](https://colab.google/) and [Jupyter Notebook](https://jupyter.org/)). Using [GQL](https://cloud.google.com/spanner/docs/reference/standard-sql/graph-intro) query syntax, you can extract graph insights and relationship patterns, including node and edge properties and neighbor analysis. The tool also provides graph schema metadata visualization, tabular results inspection and diverse layout topologies.

<img src="./assets/full_viz.png" width="800"/>

## Table of Contents  
* [Prerequisites](#prerequisites)
* [`%%spanner_graph` IPython Magics](#magic-usage)
* [Google Colab Usage (Installation-Free)](#colab-usage)
* [Installation and Usage in Jupyter Notebook](#jupyter-usage)
* [Query Requirements](#query-requirements)

<h2 id="prerequisites">
  Prerequisites
</h2>

To use this tool, you'll need to create a GCP project, a Spanner instance and a Spanner database with graph. You can follow our [Getting started with Spanner Graph](https://codelabs.developers.google.com/codelabs/spanner-graph-getting-started#0) codelab which walks through the setup.

<h2 id="magic-usage">
  <span style="font-family: monospace;">%%spanner_graph</span> IPython Magics
</h2>

Spanner Graph Notebook is implemented as an [IPython Magics](https://ipython.readthedocs.io/en/stable/config/custommagics.html). Use the `%%spanner_graph` magic command in a code cell with GCP resource options and a query string:

 - a Google Cloud [Project ID](https://cloud.google.com/resource-manager/docs/creating-managing-projects) for `--project` option. 
 - a Spanner [Instance ID](https://cloud.google.com/spanner/docs/create-manage-instances) for `--instance` option.
 - a Spanner [database name](https://cloud.google.com/spanner/docs/create-manage-databases) for `--database` option.
 - a [GQL](https://cloud.google.com/spanner/docs/graph/queries-overview) query string that returns graph elements as results.

You GQL query should return graph elements to have them visually displayed. See [Query Requirements](#query-requirements) section for examples. For instance, the code example below visually inspects 50 paths.

```
%%spanner_graph --project my-gcp-project --instance my-spanner-instance --database my-database

GRAPH MyGraph
MATCH p = (a)-[e]->(b)
RETURN TO_JSON(p) AS path_json
LIMIT 50

(Note: `my-gcp-project`, `my-spanner-instance`, `my-database`, and `MyGraph` are placeholders.  Replace them with your actual values.)
```

You can also visualize a local dataset with `--mock` flag. Note that since this is a cell magic command, you must include two newlines after the command:

```
%%spanner_graph --mock


```


<h2 id="colab-usage">
  Colab Usage (Installation-Free)
</h2>

You can directly invoke `%%spanner_graph` magic command in [Google Colab](https://colab.google/), a hosted Jupyter Notebook service that requires no setup to use. You'll be prompted to authenticate via [`pydata-google-auth`](https://github.com/pydata/pydata-google-auth) if Google Cloud Platform credentials aren't already available.

<img src="./assets/colab_usage.png" width="600"/>

<h2 id="jupyter-usage">
  Installation and Usage in Jupyter Notebook
</h2>

You can install and use this package in [Jupyter Notebook](https://jupyter.org/). We provided a [`sample.ipynb`](https://github.com/cloudspannerecosystem/spanner-graph-notebook/blob/main/sample.ipynb) in the root directory of this repo for you to follow.

### Install dependencies

Follow the commands below to create a managed Python environment (example based on [virtualenv](https://virtualenv.pypa.io/en/latest/)) and install [`spanner-graph-notebook`](https://pypi.org/project/spanner-graph-notebook/).

```shell
# Create the virtualenv `viz`.
python3 -m venv viz

# Activate the virtualenv.
source viz/bin/activate

# Install dependencies.
pip install spanner-graph-notebook
```

### Using

### Launch notebook and follow steps in `sample.ipynb`

When in the root directory of the package, run `jupyter notebook` to launch Jupyter Notebook.

```shell
jupyter notebook
```

As Jupyter local server runs, it will open up a web portal. You can create or copy the [`sample.ipynb`](https://github.com/cloudspannerecosystem/spanner-graph-notebook/blob/main/sample.ipynb) to step through an example.

<img src="./assets/sample_jupyter.png" width="600"/>

You must run `%load_ext spanner_graphs` to load this package. `sample.ipynb` contains this cell already.

<img src="./assets/load_ext.png" width="600"/>

Following the code steps in the sample notebook, you can visually inspect a mock dataset or your Spanner Graph. You'll be prompted to authenticate via [`pydata-google-auth`](https://github.com/pydata/pydata-google-auth) if Google Cloud Platform credentials aren't already available.

<img src="./assets/jupyter.gif" width="600"/>

<h2 id="query-requirements">
  Query Requirements
</h2>

### Use `TO_JSON` function to return graph elements

To visualize graph paths, nodes, and edges, graph queries must **must use** `SAFE_TO_JSON` or `TO_JSON` function in the RETURN statement. We recommend visualizing **paths** for data completeness and ease of use.

```sql
👍 Good example returning a path as JSON.


GRAPH FinGraph
MATCH query_path = (person:Person {id: 5})-[owns:Owns]->(accnt:Account)
RETURN SAFE_TO_JSON(query_path) AS path_json
```

```sql
👍 Good example returning a path as JSON in a multiple-hop query.

GRAPH FinGraph
MATCH query_path = (src:Account {id: 9})-[edge]->{1,3}(dst:Account)
RETURN SAFE_TO_JSON(query_path) as path_json
```

```sql
👍 Good example returning multiple paths as JSON.

GRAPH FinGraph
MATCH path_1 = (person:Person {id: 5})-[:Owns]->(accnt:Account),
      path_2 = (src:Account {id: 9})-[:Transfers]->(dst:Account)
RETURN SAFE_TO_JSON(path_1) as path_1,
       SAFE_TO_JSON(path_2) as path_2
```

```
👎 Anti-example returning node properties rather than JSON format graph elements.
   Scalar results other than JSON format graph elements cannot be visualized.

GRAPH FinGraph
MATCH (person:Person {id: 5})-[owns:Owns]->(accnt:Account)
RETURN person.id AS person,
       owns.amount AS owns,
       accnt.id AS accnt;
```

```sql
👎 Anti-example returning each node and edges in JSON format verbosely. This will
   work but not as easy as returning a path directly.

GRAPH FinGraph
MATCH (person:Person {id: 5})-[owns:Owns]->(accnt:Account)
RETURN SAFE_TO_JSON(person) AS person_json,
       SAFE_TO_JSON(owns) AS owns_json,
       SAFE_TO_JSON(accnt) AS accnt_json,
```

## Testing changes

First, install the test dependencies:
```shell
pip install -r requirements-test.txt
```

Then run unit and integration tests with the command below:
```shell
cd spanner_graphs && python -m unittest discover -s tests -p "*_test.py"
```

For frontend testing:
```shell
cd frontend
npm install
npm run test:unit
npm run test:visual
```
