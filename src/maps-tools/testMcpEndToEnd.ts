import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as path from 'path';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_PATH = path.resolve(__dirname, '../index.js');

function sendMcpRequest(proc: import('child_process').ChildProcessWithoutNullStreams, req: any) {
  proc.stdin.write(JSON.stringify(req) + '\n');
}

function waitForResponse(rl: readline.Interface): Promise<any> {
  return new Promise((resolve) => {
    rl.once('line', (line: string) => {
      try {
        resolve(JSON.parse(line));
      } catch (e) {
        resolve({ error: 'Invalid JSON', raw: line });
      }
    });
  });
}

function validateResponse(testName: string, response: any, expected: any) {
  console.log(`\nValidating ${testName}...`);
  
  // Check for error response
  if (response.result.isError) {
    if (expected?.error) {
      if (!response.result.content[0].text.includes(expected.error)) {
        console.error(`❌ Test failed: ${testName}`);
        console.error('Error message does not match expected');
        return false;
      }
      console.log(`✅ Test passed: ${testName} (error case)`);
      return true;
    }
    console.error(`❌ Test failed: ${testName}`);
    console.error('Response indicates error:', response.result.content[0].text);
    return false;
  }

  // Validate response structure
  const content = response.result.content[0];
  if (content.type !== 'text') {
    console.error(`❌ Test failed: ${testName}`);
    console.error('Unexpected content type:', content.type);
    return false;
  }

  // Parse response
  let parsedResponse;
  try {
    parsedResponse = JSON.parse(content.text);
  } catch (e) {
    console.error(`❌ Test failed: ${testName}`);
    console.error('Failed to parse response JSON:', e);
    return false;
  }

  // If no expected structure provided, just validate basic response format
  if (!expected) {
    console.log(`✅ Test passed: ${testName} (no expected structure)`);
    return true;
  }

  // Validate response against expected structure
  const validateValue = (actual: any, expected: any, path: string = ''): boolean => {
    if (expected === null || expected === undefined) {
      return true;
    }

    if (Array.isArray(expected)) {
      // Special prefix-only comparison
      const isPrefixOnly = expected[expected.length - 1] === '__prefix_only__';
      const expectedPrefix = isPrefixOnly ? expected.slice(0, -1) : expected;
      if (!Array.isArray(actual)) {
        console.log(`❌ Array mismatch at ${path}: expected array but got ${typeof actual}`);
        return false;
      }
      const actualPrefix = isPrefixOnly ? actual.slice(0, expectedPrefix.length) : actual;
      if (actualPrefix.length != expectedPrefix.length) {
        console.log(`❌ Array length mismatch at ${path}: expected ${expectedPrefix.length} but got ${actualPrefix.length}`);
        return false;
      }
      return expectedPrefix.every((expectedItem, index) => {
        const result = validateValue(actualPrefix[index], expectedItem, `${path}[${index}]`);
        if (!result) {
          console.log(`❌ Array element mismatch at ${path}[${index}]`);
        }
        return result;
      });
    }

    if (typeof expected === 'object') {
      if (typeof actual !== 'object' || actual === null) {
        console.log(`❌ Object mismatch at ${path}: expected object but got ${typeof actual}`);
        return false;
      }
      return Object.entries(expected).every(([key, value]) => {
        const result = validateValue(actual[key], value, `${path}.${key}`);
        if (!result) {
          console.log(`❌ Object property mismatch at ${path}.${key}`);
        }
        return result;
      });
    }

    if (actual !== expected) {
      console.log(`❌ Value mismatch at ${path}: expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      return false;
    }
    return true;
  };

  if (!validateValue(parsedResponse, expected)) {
    console.error(`❌ Test failed: ${testName}`);
    console.error('Response does not match expected structure');
    console.error('Expected:', JSON.stringify(expected, null, 2));
    console.error('Actual:', JSON.stringify(parsedResponse, null, 2));
    return false;
  }

  console.log(`✅ Test passed: ${testName}`);
  return true;
}

async function runEndToEndTests() {
  const serverProc: ChildProcessWithoutNullStreams = spawn('node', [SERVER_PATH], { stdio: ['pipe', 'pipe', 'pipe'] });
  const rl = readline.createInterface({ input: serverProc.stdout });

  // Wait a moment for server to start
  await new Promise((res) => setTimeout(res, 1000));

  const tests = [
    {
      name: 'search_nearby',
      params: {
        center: { value: 'New York, NY', isCoordinates: false },
        keyword: 'restaurant',
        radius: 500,
        openNow: false,
        minRating: 3,
      },
      expected: {
        location: {
          lat: 40.7127753,
          lng: -74.0059728,
          formatted_address: "New York, NY, USA",
          place_id: "ChIJOwg_06VPwokRYv534QaPC8g"
        },
        results: [
          {
            name: "Joe’s Pizza",
            place_id: "ChIJqdNaaBVbwokRLTafYrQlZI8",
            address: "124 Fulton St, New York, NY 10038, USA",
            location: {
              lat: 40.7100842,
              lng: -74.007677
            },
            rating: 4.6,
            total_ratings: 5570
          },
          "__prefix_only__"
        ]
      }
    },
    {
      name: 'maps_geocode',
      params: { address: '1600 Amphitheatre Parkway, Mountain View, CA' },
      expected: {
        location: {
          lat: 37.4220095,
          lng: -122.0847515
        },
        formatted_address: "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
        place_id: "ChIJF4Yf2Ry7j4AR__1AkytDyAE"
      }
    },
    {
      name: 'maps_reverse_geocode',
      params: { latitude: 37.4221, longitude: -122.0841 },
      expected: {
        formatted_address: "1650 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
        place_id: "ChIJ7QyWfAK6j4ARZVceh-DuRpc",
        address_components: [
          {
            long_name: "1650",
            short_name: "1650",
            types: ["street_number"]
          },
          {
            long_name: "Amphitheatre Parkway",
            short_name: "Amphitheatre Pkwy",
            types: ["route"]
          },
          {
            long_name: "Mountain View",
            short_name: "Mountain View",
            types: ["locality", "political"]
          },
          {
            long_name: "Santa Clara County",
            short_name: "Santa Clara County",
            types: ["administrative_area_level_2", "political"]
          },
          {
            long_name: "California",
            short_name: "CA",
            types: ["administrative_area_level_1", "political"]
          },
          {
            long_name: "United States",
            short_name: "US",
            types: ["country", "political"]
          },
          {
            long_name: "94043",
            short_name: "94043",
            types: ["postal_code"]
          }
        ]
      }
    },
    {
      name: 'maps_distance_matrix',
      params: {
        origins: ['New York, NY', 'Boston, MA'],
        destinations: ['Philadelphia, PA', 'Washington, DC'],
        mode: 'driving',
      },
      expected: {
        distances: [
          [
            { value: 156420, text: "156 km" },
            { value: 368305, text: "368 km" }
          ],
          [
            { value: 493626, text: "494 km" },
            { value: 705510, text: "706 km" }
          ]
        ],
        durations: [
          [
            { value: 6172, text: "1 hour 43 mins" },
            { value: 14047, text: "3 hours 54 mins" }
          ],
          [
            { value: 17793, text: "4 hours 57 mins" },
            { value: 25668, text: "7 hours 8 mins" }
          ]
        ],
        origin_addresses: [
          "New York, NY, USA",
          "Boston, MA, USA"
        ],
        destination_addresses: [
          "Philadelphia, PA, USA",
          "Washington, DC, USA"
        ]
      }
    },
    {
      name: 'maps_directions',
      params: {
        origin: 'New York, NY',
        destination: 'Boston, MA',
        mode: 'driving',
      },
      expected: {
        routes: [
          {
            legs: [
              {
                distanceMeters: 344878,
                duration: "13039s",
                staticDuration: "13039s",
                startLocation: {
                  latLng: {
                    latitude: 40.712759299999995,
                    longitude: -74.0065123
                  }
                },
                endLocation: {
                  latLng: {
                    latitude: 42.3555128,
                    longitude: -71.0565249
                  }
                }
              }
            ]
          }
        ]
      }
    },
    {
      name: 'maps_elevation',
      params: {
        locations: [
          { latitude: 37.4221, longitude: -122.0841 },
          { latitude: 40.7128, longitude: -74.0060 },
        ],
      },
      expected: [
        {
          elevation: 7.246564865112305,
          location: {
            lat: 37.4221,
            lng: -122.0841
          }
        },
        {
          elevation: 13.25829410552979,
          location: {
            lat: 40.7128,
            lng: -74.006
          }
        }
      ]
    },
    {
      name: 'get_place_details',
      params: { placeId: 'ChIJ2eUgeAK6j4ARbn5u_wAGqWA' },
      expected: {
        name: "1600 Amphitheatre Pkwy",
        address: "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
        location: {
          lat: 37.4220095,
          lng: -122.08475149999998
        }
      }
    },
    // Add a test with an invalid type to check error reporting
    {
      name: 'search_nearby',
      params: {
        center: { value: 'Osaka, Japan', isCoordinates: false },
        keyword: 'tourist attractions', // invalid type
        radius: 10000,
      },
      expected: {
        error: 'Unsupported types: tourist attractions.'
      }
    },
    // New test cases for unexpected MCP server results
    {
      name: 'maps_distance_matrix',
      params: {
        origins: '34.6777,135.4918|34.66234,135.50944|34.66488384221071,135.50393007009689|34.6726,135.5101|34.666,135.5168|34.6661,135.5054|34.66244,135.51608|34.66157,135.49656|34.6661,135.5078|34.669,135.4945|34.6726,135.5102|34.668487932489725,135.51046035988145|34.66729906935485,135.50819381156148|34.67034837810278,135.51168683617266|34.66722,135.50677|34.674357943153794,135.50848780092522|34.66029136325116,135.49197438883795|34.66304204485885,135.50430651673548',
        destinations: '34.6656768,135.4323185',
        mode: 'transit',
      },
      expected: {
        distances: [
          [null],
          [null],
          "__prefix_only__"
        ],
        durations: [
          [null],
          [null],
          "__prefix_only__"
        ],
        origin_addresses: [
          "34.6777,135.4918",
          "34.66234,135.50944",
          "34.664883842210713,135.50393007009689",
          "__prefix_only__"
        ],
        destination_addresses: [
          "34.6656768,135.4323185"
        ]
      }
    },
    {
      name: 'maps_directions',
      params: {
        origin: 'Horie Apartment, Osaka',
        destination: 'Universal Studios Japan, Osaka',
        mode: 'transit',
      },
      expected: {
        error: 'No route found'
      }
    },
    {
      name: 'search_nearby',
      params: {
        center: { value: 'Shinsaibashi, Osaka' },
        keyword: 'hotel OR accommodation OR apartment',
        radius: 1000,
      },
      expected: {
        error: 'Unsupported types: hotel OR accommodation OR apartment.'
      }
    },
    {
      name: 'maps_directions',
      params: {
        origin: '34.6777, 135.4918',
        destination: 'Universal Studios Japan, Osaka',
        mode: 'transit',
      },
      expected: {
        error: 'LatLng: "34.6777, 135.4918" cannot be specified as an Address Waypoint. Please see documentation on ComputeRoutesRequest.waypoint.location in order to specify a valid LatLng Waypoint'
      }
    },
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  let reqId = 1;
  for (const test of tests) {
    const req = {
      jsonrpc: '2.0',
      id: reqId++,
      method: 'tools/call',
      params: {
        name: test.name,
        arguments: test.params,
      },
    };
    console.log(`\n--- Testing ${test.name} ---`);
    sendMcpRequest(serverProc, req);
    const resp = await waitForResponse(rl);
    console.dir(resp, { depth: 10 });
    
    if (validateResponse(test.name, resp, test.expected)) {
      passedTests++;
    }
  }

  console.log(`\n=== Test Summary ===`);
  console.log(`Passed: ${passedTests}/${totalTests} tests`);

  serverProc.kill();
  rl.close();
}

runEndToEndTests().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
}); 
