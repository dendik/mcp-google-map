import * as dotenv from 'dotenv';
dotenv.config();

import { PlacesSearcher } from './searchPlaces.js';

async function testAllTools() {
  const searcher = new PlacesSearcher();

  console.log('--- Testing searchNearby ---');
  try {
    const res = await searcher.searchNearby({
      center: { value: 'New York, NY', isCoordinates: false },
      keyword: 'restaurant',
      radius: 500,
      openNow: false,
      minRating: 3,
    });
    console.log('searchNearby:', res);
  } catch (e) {
    console.error('searchNearby error:', e);
  }

  console.log('--- Testing geocode ---');
  try {
    const res = await searcher.geocode('1600 Amphitheatre Parkway, Mountain View, CA');
    console.log('geocode:', res);
  } catch (e) {
    console.error('geocode error:', e);
  }

  console.log('--- Testing reverseGeocode ---');
  try {
    const res = await searcher.reverseGeocode(37.4221, -122.0841);
    console.log('reverseGeocode:', res);
  } catch (e) {
    console.error('reverseGeocode error:', e);
  }

  console.log('--- Testing calculateDistanceMatrix ---');
  try {
    const res = await searcher.calculateDistanceMatrix([
      'New York, NY',
      'Boston, MA',
    ], [
      'Philadelphia, PA',
      'Washington, DC',
    ], 'driving');
    console.log('calculateDistanceMatrix:', res);
  } catch (e) {
    console.error('calculateDistanceMatrix error:', e);
  }

  console.log('--- Testing getDirections ---');
  try {
    const res = await searcher.getDirections('New York, NY', 'Boston, MA', 'driving');
    console.log('getDirections:', res);
  } catch (e) {
    console.error('getDirections error:', e);
  }

  console.log('--- Testing getElevation ---');
  try {
    const res = await searcher.getElevation([
      { latitude: 37.4221, longitude: -122.0841 },
      { latitude: 40.7128, longitude: -74.0060 },
    ]);
    console.log('getElevation:', res);
  } catch (e) {
    console.error('getElevation error:', e);
  }

  console.log('--- Testing getPlaceDetails ---');
  try {
    // Use a known place_id from a previous searchNearby or geocode result, or a hardcoded one for testing
    const placeId = 'ChIJ2eUgeAK6j4ARbn5u_wAGqWA'; // Googleplex
    const res = await searcher.getPlaceDetails(placeId);
    console.log('getPlaceDetails:', res);
  } catch (e) {
    console.error('getPlaceDetails error:', e);
  }
}

testAllTools().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
}); 
 