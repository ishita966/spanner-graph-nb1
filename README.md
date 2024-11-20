# Spanner Graph Notebook: Explore Your Data Visually


The Spanner Graph Notebook tool provides an efficient way for you to query [Spanner Graph](https://cloud.google.com/spanner/docs/graph/overview) visually in a notebook environment (e.g. [Jupyter Notebook](https://jupyter.org/) and [Google Colab](https://colab.google/)). Using [GQL](https://cloud.google.com/spanner/docs/reference/standard-sql/graph-intro) query syntax, you can can extract graph insights and relationship patterns, including node and edge properties, neighbor analysis, schema metadata, and diverse layout topologies.

<img src="./assets/full_viz.png" width="800"/>

## Install dependencies

All dependencies below must be installed before using the tool.

### Install the `gcloud` CLI

`gcloud` CLI is needed for authentication. Follow the installation [manual](https://cloud.google.com/sdk/docs/install) to install.

### Install dependencies

Download this package and install its dependencies. Python dependencies should ideally be installed in a managed Python environment using tools like `conda` or `virtualenv`.

When in the root directory of the package, follow the command below to create a managed Python environment (example based on `virtualenv`) and install dependencies.

```shell
# Create the virtualenv `viz`.
python3 -m venv viz

# Activate the virtualenv.
source viz/bin/activate
```

```shell
# Install dependencies.
pip install .
```

## Using

### Launch notebook and follow steps in `sample.ipynb`

When in the root directory of the package, run `jupyter notebook` to launch Jupyter Notebook.

```shell
jupyter notebook
```

As Jupyter local server runs, it will open up a web portal. You can open open the `sample.ipynb` to step through an example.

<img src="./assets/sample_jupyter.png" width="600"/>

You must run `%load_ext spanner_graphs` to load this package. `sample.ipynb` contains this cell already.

<img src="./assets/load_ext.png" width="600"/>

### `%%spanner_graph` magic command

This package provides a `%%spanner_graph` magic command, which visualizes graph data in the notebook output cell.

### Query and visualize a local dataset with `--mock` flag

Using the `--mock` flag for `%%spanner_graph`, you can visualize local graph datasets without connecting to a live Cloud Spanner database. The mock
dataset renders a network of `person` and `account` nodes, along with edges in between. There is an inserted cell in `sample.ipynb` for the code below.

```
%%spanner_graph --mock

```

<img src="./assets/mock_data_result.png" width="600"/>


### Visualize graph queries from your Spanner Graph database

#### Authentication

To connect to your Spanner database, you need to first authenticate via `gcloud auth`. `gcloud` CLI is needed to use the tool. Follow the installation [manual](https://cloud.google.com/sdk/docs/install) to install.

`sample.ipynb` has inserted a code cell for authentication below. Running this opens a new browser tab for the Google Cloud authentication process.

```shell
!gcloud auth application-default login
```

#### Query and visualize Spanner Graph data

Using the `%%spanner_graph` magic command, you can visualize graph query results from your Spanner database.

The magic command needs to be used with your GCP resource info and a query string:
 - a GCP project id for `--project` option
 - a Spanner instance id for `--instance` option
 - a Spanner Graph database id for `--database` option
 - a [GQL](https://cloud.google.com/spanner/docs/graph/queries-overview) query string

<img src="./assets/hero_with_properties.png" width="800">

## Query Requirements

### Use `TO_JSON` function to return graph elements

Graph queries **must use** `TO_JSON` function in the `RETURN` statement to visualize paths, nodes and edges. We recommend visualizing **paths** for data completeness and ease of use.

```sql
👍 Good example returning a path as JSON.


GRAPH FinGraph
MATCH query_path = (person:Person {id: 5})-[owns:Owns]->(accnt:Account)
RETURN TO_JSON(query_path) AS path_json
```

```sql
👍 Good example returning a path as JSON in a multiple-hop query.

GRAPH FinGraph
MATCH query_path = (src:Account {id: 9})-[edge]->{1,3}(dst:Account)
RETURN TO_JSON(query_path) as path_json
```

```sql
👍 Good example returning multiple paths as JSON.

GRAPH FinGraph
MATCH path_1 = (person:Person {id: 5})-[:Owns]->(accnt:Account),
      path_2 = (src:Account {id: 9})-[:Transfers]->(dst:Account)
RETURN TO_JSON(path_1) as path_1,
       TO_JSON(path_2) as path_2
```

```
👎 Anti-example returning nodes properties rather than JSON format graph elements.
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
RETURN TO_JSON(person) AS person_json,
       TO_JSON(owns) AS owns_json,
       TO_JSON(accnt) AS accnt_json,
```

## Testing changes

After adding new changes, please run unit and integration tests with the command below:


```shell
cd spanner_graphs && python -m unittest discover -s tests -p "*_test.py"
```
