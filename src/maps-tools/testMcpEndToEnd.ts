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
    },
    {
      name: 'maps_geocode',
      params: { address: '1600 Amphitheatre Parkway, Mountain View, CA' },
    },
    {
      name: 'maps_reverse_geocode',
      params: { latitude: 37.4221, longitude: -122.0841 },
    },
    {
      name: 'maps_distance_matrix',
      params: {
        origins: ['New York, NY', 'Boston, MA'],
        destinations: ['Philadelphia, PA', 'Washington, DC'],
        mode: 'driving',
      },
    },
    {
      name: 'maps_directions',
      params: {
        origin: 'New York, NY',
        destination: 'Boston, MA',
        mode: 'driving',
      },
    },
    {
      name: 'maps_elevation',
      params: {
        locations: [
          { latitude: 37.4221, longitude: -122.0841 },
          { latitude: 40.7128, longitude: -74.0060 },
        ],
      },
    },
    {
      name: 'get_place_details',
      params: { placeId: 'ChIJ2eUgeAK6j4ARbn5u_wAGqWA' },
    },
    // Add a test with an invalid type to check error reporting
    {
      name: 'search_nearby',
      params: {
        center: { value: 'Osaka, Japan', isCoordinates: false },
        keyword: 'tourist attractions', // invalid type
        radius: 10000,
      },
    },
  ];

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
  }

  serverProc.kill();
  rl.close();
}

runEndToEndTests().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
}); 
