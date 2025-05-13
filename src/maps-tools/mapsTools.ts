export const SEARCH_NEARBY_TOOL = {
  name: "search_nearby",
  description: "Search for nearby places",
  inputSchema: {
    type: "object",
    properties: {
      center: {
        type: "object",
        properties: {
          value: { type: "string", description: "Address, landmark name, or coordinates (coordinate format: lat,lng)" },
          isCoordinates: { type: "boolean", description: "Whether the input is coordinates", default: false },
        },
        required: ["value"],
        description: "Search center point",
      },
      keyword: {
        type: "string",
        description: "Search keyword (e.g., restaurant, cafe)",
      },
      radius: {
        type: "number",
        description: "Search radius (meters)",
        default: 1000,
      },
      openNow: {
        type: "boolean",
        description: "Show only places that are currently open",
        default: false,
      },
      minRating: {
        type: "number",
        description: "Minimum rating requirement (0-5)",
        minimum: 0,
        maximum: 5,
      },
    },
    required: ["center"],
  },
};

export const GEOCODE_TOOL = {
  name: "maps_geocode",
  description: "Convert address to coordinates",
  inputSchema: {
    type: "object",
    properties: {
      address: {
        type: "string",
        description: "Address or landmark name to convert",
      },
    },
    required: ["address"],
  },
};

export const REVERSE_GEOCODE_TOOL = {
  name: "maps_reverse_geocode",
  description: "Convert coordinates to address",
  inputSchema: {
    type: "object",
    properties: {
      latitude: {
        type: "number",
        description: "Latitude",
      },
      longitude: {
        type: "number",
        description: "Longitude",
      },
    },
    required: ["latitude", "longitude"],
  },
};

export const DISTANCE_MATRIX_TOOL = {
  name: "maps_distance_matrix",
  description: "Calculate distance and time between multiple origins and destinations",
  inputSchema: {
    type: "object",
    properties: {
      origins: {
        type: "array",
        items: {
          type: "string",
        },
        description: "List of origin addresses or coordinates",
      },
      destinations: {
        type: "array",
        items: {
          type: "string",
        },
        description: "List of destination addresses or coordinates",
      },
      mode: {
        type: "string",
        enum: ["driving", "walking", "bicycling", "transit"],
        description: "Travel mode",
        default: "driving",
      },
    },
    required: ["origins", "destinations"],
  },
};

export const DIRECTIONS_TOOL = {
  name: "maps_directions",
  description: "Get directions between two points",
  inputSchema: {
    type: "object",
    properties: {
      origin: {
        type: "string",
        description: "Origin address or coordinates",
      },
      destination: {
        type: "string",
        description: "Destination address or coordinates",
      },
      mode: {
        type: "string",
        enum: ["driving", "walking", "bicycling", "transit"],
        description: "Travel mode",
        default: "driving",
      },
    },
    required: ["origin", "destination"],
  },
};

export const ELEVATION_TOOL = {
  name: "maps_elevation",
  description: "Get elevation data for locations",
  inputSchema: {
    type: "object",
    properties: {
      locations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            latitude: {
              type: "number",
              description: "Latitude",
            },
            longitude: {
              type: "number",
              description: "Longitude",
            },
          },
          required: ["latitude", "longitude"],
        },
        description: "List of locations to get elevation data for",
      },
    },
    required: ["locations"],
  },
};

export const GET_PLACE_DETAILS_TOOL = {
  name: "get_place_details",
  description: "Get detailed information about a specific place",
  inputSchema: {
    type: "object",
    properties: {
      placeId: {
        type: "string",
        description: "Google Maps Place ID",
      },
    },
    required: ["placeId"],
  },
};
