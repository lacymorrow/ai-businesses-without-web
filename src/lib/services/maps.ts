/// <reference types="@types/google.maps" />
import { Business, SearchParameters, SearchResult, WebsiteType } from '@/types/business';

const FACEBOOK_DOMAINS = ['facebook.com', 'fb.com'];
const YELP_DOMAINS = ['yelp.com'];
const PLATFORM_DOMAINS = [
  // Social/Review platforms
  'yelp.com',
  'facebook.com',
  'fb.com',
  'instagram.com',
  'linkedin.com',

  // Website builders/platforms
  'shopify.com',
  'wix.com',
  'squarespace.com',
  'weebly.com',
  'wordpress.com', // Note: Only hosted wordpress.com sites, not self-hosted WordPress
  'godaddy.com',

  // Restaurant/service platforms
  'doordash.com',
  'ubereats.com',
  'grubhub.com',
  'opentable.com',
  'booksy.com',
  'vagaro.com',

  // Business directories
  'yellowpages.com',
  'manta.com',
  'bbb.org',
  'tripadvisor.com'
];

/**
 * Determines the website type based on the URL
 * @param url The website URL to analyze
 * @returns The type of website (none, facebook, yelp, or other)
 */
function determineWebsiteType(url?: string): WebsiteType {
  if (!url) return 'none';

  try {
    const domain = new URL(url).hostname.toLowerCase();

    // Check if it's a Facebook page
    if (FACEBOOK_DOMAINS.some(fb => domain.includes(fb))) {
      return 'facebook';
    }

    // Check if it's a Yelp page
    if (YELP_DOMAINS.some(yelp => domain.includes(yelp))) {
      return 'yelp';
    }

    // Check if it's another platform
    if (PLATFORM_DOMAINS.some(platform => domain.includes(platform))) {
      return 'other';
    }

    // If it's not a known platform, assume it's a legitimate website
    return 'legitimate';
  } catch {
    return 'none';
  }
}

/**
 * Extracts social profile URLs from place details
 * @param urls Array of URLs associated with the place
 * @returns Categorized social profile URLs
 */
function extractSocialProfiles(urls: string[] = []) {
  return urls.reduce((profiles, url) => {
    try {
      const domain = new URL(url).hostname.toLowerCase();

      if (FACEBOOK_DOMAINS.some(fb => domain.includes(fb))) {
        profiles.facebook = url;
      } else if (YELP_DOMAINS.some(yelp => domain.includes(yelp))) {
        profiles.yelp = url;
      } else if (domain.includes('instagram.com')) {
        profiles.instagram = url;
      } else {
        profiles.other = [...(profiles.other || []), url];
      }
    } catch {
      // Invalid URL, skip it
    }
    return profiles;
  }, {} as Record<string, any>);
}

/**
 * Maps Google Places data to our Business interface
 * @param place Google Places API place data
 * @param searchQuery The original search query used
 * @returns Formatted business data
 */
function mapPlaceToBusiness(
  place: google.maps.places.PlaceResult,
  searchQuery: string
): Business {
  const website = place.website;
  const websiteType = determineWebsiteType(website);

  // Handle business status according to Google Places API
  let businessStatus: Business['businessStatus'] = 'OPERATIONAL';

  // Explicitly type and assign the business_status
  if (place.business_status) {
    businessStatus = place.business_status as Business['businessStatus'];
  }

  return {
    id: place.place_id!,
    name: place.name!,
    address: place.formatted_address!,
    location: {
      lat: place.geometry!.location!.lat(),
      lng: place.geometry!.location!.lng(),
    },
    category: place.types || [],
    websiteType,
    websiteUrl: website,
    socialProfiles: extractSocialProfiles(place.url ? [place.url] : []),
    phoneNumber: place.formatted_phone_number,
    lastUpdated: new Date(),
    searchQuery,
    businessStatus,
  };
}

/**
 * Searches for businesses using Google Places API
 * @param params Search parameters
 * @returns Search results with business data
 */
export async function searchBusinesses(
  params: SearchParameters
): Promise<SearchResult> {
  const { location, radius, categories, excludeWebsiteTypes, limit = 20 } = params;

  // Initialize Places service
  const service = new google.maps.places.PlacesService(
    document.createElement('div')
  );

  // Convert location string to coordinates using Geocoding service
  const geocoder = new google.maps.Geocoder();
  const geocodeResult = await new Promise<google.maps.GeocoderResult[]>(
    (resolve, reject) => {
      geocoder.geocode(
        { address: location },
        (
          results: google.maps.GeocoderResult[] | null,
          status: google.maps.GeocoderStatus
        ) => {
          if (status === google.maps.GeocoderStatus.OK && results) {
            resolve(results);
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        }
      );
    }
  );

  const searchLocation = geocodeResult[0].geometry.location;

  // Perform nearby search
  const searchResult = await new Promise<google.maps.places.PlaceResult[]>(
    (resolve, reject) => {
      service.nearbySearch(
        {
          location: searchLocation,
          radius,
          type: categories?.[0]
        },
        (
          results: google.maps.places.PlaceResult[] | null,
          status: google.maps.places.PlacesServiceStatus,
          pagination: google.maps.places.PlaceSearchPagination | null
        ) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            resolve(results);
          } else {
            reject(new Error(`Places search failed: ${status}`));
          }
        }
      );
    }
  );

  // Get detailed information for each place
  const detailedPlaces = await Promise.all(
    searchResult.map(
      (place) =>
        new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
          service.getDetails(
            {
              placeId: place.place_id!,
              fields: [
                'place_id',
                'name',
                'business_status',
                'formatted_address',
                'formatted_phone_number',
                'geometry',
                'website',
                'url',
                'types'
              ]
            },
            (
              result: google.maps.places.PlaceResult | null,
              status: google.maps.places.PlacesServiceStatus
            ) => {
              if (
                status === google.maps.places.PlacesServiceStatus.OK &&
                result
              ) {
                // Create a new object with only the fields we need
                const placeDetails = {
                  place_id: result.place_id,
                  name: result.name,
                  business_status: result.business_status,
                  formatted_address: result.formatted_address,
                  formatted_phone_number: result.formatted_phone_number,
                  geometry: result.geometry,
                  website: result.website,
                  url: result.url,
                  types: result.types
                };
                resolve(placeDetails as google.maps.places.PlaceResult);
              } else {
                reject(new Error(`Place details failed: ${status}`));
              }
            }
          );
        })
    )
  );

  // Map and filter results
  let businesses = detailedPlaces
    .map((place) => mapPlaceToBusiness(place, location))
    .filter((business) => {
      // Filter out permanently closed businesses
      if (business.businessStatus === 'PERMANENTLY_CLOSED') {
        return false;
      }

      // If no website type filter is specified, only show businesses without legitimate websites
      if (!excludeWebsiteTypes || excludeWebsiteTypes.length === 0) {
        return business.websiteType !== 'legitimate';
      }

      // Otherwise, show businesses that match the specified website types
      return excludeWebsiteTypes.includes(business.websiteType);
    })
    .slice(0, limit);

  return {
    businesses,
    totalCount: businesses.length,
    hasMore: false, // Implement pagination later
  };
}

/**
 * Analyzes a specific business's website and social presence
 * @param placeId Google Places ID
 * @returns Detailed business information
 */
export async function analyzeBusiness(placeId: string): Promise<Business> {
  const service = new google.maps.places.PlacesService(
    document.createElement('div')
  );

  const place = await new Promise<google.maps.places.PlaceResult>(
    (resolve, reject) => {
      service.getDetails(
        {
          placeId,
          fields: [
            'place_id',
            'name',
            'business_status',
            'formatted_address',
            'formatted_phone_number',
            'geometry',
            'website',
            'url',
            'types'
          ]
        },
        (
          result: google.maps.places.PlaceResult | null,
          status: google.maps.places.PlacesServiceStatus
        ) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && result) {
            // Create a new object with only the fields we need
            const placeDetails = {
              place_id: result.place_id,
              name: result.name,
              business_status: result.business_status,
              formatted_address: result.formatted_address,
              formatted_phone_number: result.formatted_phone_number,
              geometry: result.geometry,
              website: result.website,
              url: result.url,
              types: result.types
            };
            resolve(placeDetails as google.maps.places.PlaceResult);
          } else {
            reject(new Error(`Place details failed: ${status}`));
          }
        }
      );
    }
  );

  return mapPlaceToBusiness(place, '');
}
