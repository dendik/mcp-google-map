import { Client, Language, TravelMode } from "@googlemaps/google-maps-services-js";
import * as dotenv from "dotenv";
import axios from "axios";

// Ensure environment variables are loaded
dotenv.config();

interface SearchParams {
  location: { lat: number; lng: number };
  radius?: number;
  keyword?: string;
  openNow?: boolean;
  minRating?: number;
}

interface PlaceResult {
  name: string;
  place_id: string;
  formatted_address?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: {
    open_now?: boolean;
  };
}

interface GeocodeResult {
  lat: number;
  lng: number;
  formatted_address?: string;
  place_id?: string;
}

export class GoogleMapsTools {
  private client: Client;
  private readonly defaultLanguage: Language = Language.en;

  constructor() {
    this.client = new Client({});
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      throw new Error("Google Maps API Key is required");
    }
  }

  async searchNearbyPlaces(params: SearchParams): Promise<PlaceResult[]> {
    const searchParams = {
      location: params.location,
      radius: params.radius || 1000,
      keyword: params.keyword,
      opennow: params.openNow,
      language: this.defaultLanguage,
      key: process.env.GOOGLE_MAPS_API_KEY || "",
    };

    try {
      const response = await this.client.placesNearby({
        params: searchParams,
      });

      let results = response.data.results;

      // Filter by minimum rating if specified
      if (params.minRating) {
        results = results.filter((place) => (place.rating || 0) >= (params.minRating || 0));
      }

      return results as PlaceResult[];
    } catch (error) {
      console.error("Error in searchNearbyPlaces:", error);
      throw new Error("Error occurred while searching nearby places");
    }
  }

  async getPlaceDetails(placeId: string) {
    try {
      const response = await this.client.placeDetails({
        params: {
          place_id: placeId,
          fields: ["name", "rating", "formatted_address", "opening_hours", "reviews", "geometry", "formatted_phone_number", "website", "price_level", "photos"],
          language: this.defaultLanguage,
          key: process.env.GOOGLE_MAPS_API_KEY || "",
        },
      });
      return response.data.result;
    } catch (error) {
      console.error("Error in getPlaceDetails:", error);
      throw new Error("Error occurred while getting place details");
    }
  }

  private async geocodeAddress(address: string): Promise<GeocodeResult> {
    try {
      const response = await this.client.geocode({
        params: {
          address: address,
          key: process.env.GOOGLE_MAPS_API_KEY || "",
          language: this.defaultLanguage,
        },
      });

      if (response.data.results.length === 0) {
        throw new Error("Location not found for this address");
      }

      const result = response.data.results[0];
      const location = result.geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
        formatted_address: result.formatted_address,
        place_id: result.place_id,
      };
    } catch (error) {
      console.error("Error in geocodeAddress:", error);
      throw new Error("Error occurred while converting address to coordinates");
    }
  }

  private parseCoordinates(coordString: string): GeocodeResult {
    const coords = coordString.split(",").map((c) => parseFloat(c.trim()));
    if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
      throw new Error("Invalid coordinate format. Please use 'latitude,longitude' format");
    }
    return { lat: coords[0], lng: coords[1] };
  }

  async getLocation(center: { value: string; isCoordinates: boolean }): Promise<GeocodeResult> {
    if (center.isCoordinates) {
      return this.parseCoordinates(center.value);
    }
    return this.geocodeAddress(center.value);
  }

  // 新增公開方法用於地址轉座標
  async geocode(address: string): Promise<{
    location: { lat: number; lng: number };
    formatted_address: string;
    place_id: string;
  }> {
    try {
      const result = await this.geocodeAddress(address);
      return {
        location: { lat: result.lat, lng: result.lng },
        formatted_address: result.formatted_address || "",
        place_id: result.place_id || "",
      };
    } catch (error) {
      console.error("Error in geocode:", error);
      throw new Error("Error occurred while converting address to coordinates");
    }
  }

  async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<{
    formatted_address: string;
    place_id: string;
    address_components: any[];
  }> {
    try {
      const response = await this.client.reverseGeocode({
        params: {
          latlng: { lat: latitude, lng: longitude },
          language: this.defaultLanguage,
          key: process.env.GOOGLE_MAPS_API_KEY || "",
        },
      });

      if (response.data.results.length === 0) {
        throw new Error("Address not found for these coordinates");
      }

      const result = response.data.results[0];
      return {
        formatted_address: result.formatted_address,
        place_id: result.place_id,
        address_components: result.address_components,
      };
    } catch (error) {
      console.error("Error in reverseGeocode:", error);
      throw new Error("Error occurred while converting coordinates to address");
    }
  }

  async calculateDistanceMatrix(
    origins: string[],
    destinations: string[],
    mode: "driving" | "walking" | "bicycling" | "transit" = "driving"
  ): Promise<{
    distances: any[][];
    durations: any[][];
    origin_addresses: string[];
    destination_addresses: string[];
  }> {
    try {
      const response = await this.client.distancematrix({
        params: {
          origins: origins,
          destinations: destinations,
          mode: mode as TravelMode,
          language: this.defaultLanguage,
          key: process.env.GOOGLE_MAPS_API_KEY || "",
        },
      });

      const result = response.data;

      if (result.status !== "OK") {
        throw new Error(`Distance matrix calculation failed: ${result.status}`);
      }

      const distances: any[][] = [];
      const durations: any[][] = [];

      result.rows.forEach((row: any) => {
        const distanceRow: any[] = [];
        const durationRow: any[] = [];

        row.elements.forEach((element: any) => {
          if (element.status === "OK") {
            distanceRow.push({
              value: element.distance.value,
              text: element.distance.text,
            });
            durationRow.push({
              value: element.duration.value,
              text: element.duration.text,
            });
          } else {
            distanceRow.push(null);
            durationRow.push(null);
          }
        });

        distances.push(distanceRow);
        durations.push(durationRow);
      });

      return {
        distances: distances,
        durations: durations,
        origin_addresses: result.origin_addresses,
        destination_addresses: result.destination_addresses,
      };
    } catch (error) {
      console.error("Error in calculateDistanceMatrix:", error);
      throw new Error("Error occurred while calculating distance matrix");
    }
  }

  async getDirections(
    origin: string,
    destination: string,
    mode: "driving" | "walking" | "bicycling" | "transit" = "driving"
  ): Promise<{
    routes: any[];
    summary: string;
    total_distance: { value: number; text: string };
    total_duration: { value: number; text: string };
  }> {
    try {
      // Map legacy modes to Routes API travelMode
      const travelModeMap: Record<string, string> = {
        driving: "DRIVE",
        walking: "WALK",
        bicycling: "BICYCLE",
        transit: "TRANSIT"
      };
      const travelMode = travelModeMap[mode] || "DRIVE";
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) throw new Error("Google Maps API Key is required");
      const response = await axios.post(
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        {
          origin: { address: origin },
          destination: { address: destination },
          travelMode
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.legs,routes.routeLabels"
          }
        }
      );
      const routes = response.data.routes || [];
      if (routes.length === 0) throw new Error("No route found");
      const firstRoute = routes[0];
      const legs = firstRoute.legs && firstRoute.legs[0];
      return {
        routes,
        summary: firstRoute.routeLabels ? firstRoute.routeLabels.join(", ") : "",
        total_distance: {
          value: firstRoute.distanceMeters,
          text: firstRoute.distanceMeters ? `${firstRoute.distanceMeters / 1000} km` : ""
        },
        total_duration: {
          value: firstRoute.duration ? parseInt(firstRoute.duration.replace(/[^\d]/g, ""), 10) : 0,
          text: firstRoute.duration || ""
        }
      };
    } catch (error) {
      console.error("Error in getDirections (Routes API):", error);
      throw new Error("Error occurred while getting directions (Routes API)");
    }
  }

  async getElevation(locations: Array<{ latitude: number; longitude: number }>): Promise<Array<{ elevation: number; location: { lat: number; lng: number } }>> {
    try {
      const formattedLocations = locations.map((loc) => ({
        lat: loc.latitude,
        lng: loc.longitude,
      }));

      const response = await this.client.elevation({
        params: {
          locations: formattedLocations,
          key: process.env.GOOGLE_MAPS_API_KEY || "",
        },
      });

      const result = response.data;

      if (result.status !== "OK") {
        throw new Error(`Failed to get elevation data: ${result.status}`);
      }

      return result.results.map((item: any, index: number) => ({
        elevation: item.elevation,
        location: formattedLocations[index],
      }));
    } catch (error) {
      console.error("Error in getElevation:", error);
      throw new Error("Error occurred while getting elevation data");
    }
  }
}
