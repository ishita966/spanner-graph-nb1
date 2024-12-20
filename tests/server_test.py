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

import unittest
from spanner_graphs.graph_server import GraphServer

class MyTestCase(unittest.TestCase):
    def test_ping(self):
        thread = GraphServer.init()
        self.assertTrue(thread.is_alive())

        response = GraphServer.get_ping()
        self.assertEqual(response, {"message": "pong"})

        request = {"data": "ping"}
        response = GraphServer.post_ping(request)
        self.assertEqual(response, {"your_request": request})

if __name__ == '__main__':
    unittest.main()
