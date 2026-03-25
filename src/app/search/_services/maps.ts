/// <reference types="@types/google.maps" />
import type { Business, SearchParameters, SearchResult, WebsiteType } from "../_types/business";

// Declare google as a global variable for TypeScript
declare const google: any;

const FACEBOOK_DOMAINS = ["facebook.com", "fb.com"];
const YELP_DOMAINS = ["yelp.com"];
const PLATFORM_DOMAINS = [
	// Social/Review platforms
	"yelp.com",
	"facebook.com",
	"fb.com",
	"instagram.com",
	"linkedin.com",

	// Website builders/platforms
	"shopify.com",
	"wix.com",
	"squarespace.com",
	"weebly.com",
	"wordpress.com", // Note: Only hosted wordpress.com sites, not self-hosted WordPress
	"godaddy.com",

	// Restaurant/service platforms
	"doordash.com",
	"ubereats.com",
	"grubhub.com",
	"opentable.com",
	"booksy.com",
	"vagaro.com",

	// Business directories
	"yellowpages.com",
	"manta.com",
	"bbb.org",
	"tripadvisor.com",
];

/**
 * Determines the website type based on the URL
 * @param url The website URL to analyze
 * @returns The type of website (none, facebook, yelp, or other)
 */
function determineWebsiteType(url?: string): WebsiteType {
	if (!url) return "none";

	try {
		const domain = new URL(url).hostname.toLowerCase();

		// Check if it's a Facebook page
		if (FACEBOOK_DOMAINS.some((fb) => domain.includes(fb))) {
			return "facebook";
		}

		// Check if it's a Yelp page
		if (YELP_DOMAINS.some((yelp) => domain.includes(yelp))) {
			return "yelp";
		}

		// Check if it's another platform
		if (PLATFORM_DOMAINS.some((platform) => domain.includes(platform))) {
			return "other";
		}

		// If it's not a known platform, assume it's a legitimate website
		return "legitimate";
	} catch {
		return "none";
	}
}

/**
 * Extracts social profile URLs from place details
 * @param urls Array of URLs associated with the place
 * @returns Categorized social profile URLs
 */
function extractSocialProfiles(urls: string[] = []) {
	return urls.reduce(
		(profiles, url) => {
			try {
				const domain = new URL(url).hostname.toLowerCase();

				if (FACEBOOK_DOMAINS.some((fb) => domain.includes(fb))) {
					profiles.facebook = url;
				} else if (YELP_DOMAINS.some((yelp) => domain.includes(yelp))) {
					profiles.yelp = url;
				} else if (domain.includes("instagram.com")) {
					profiles.instagram = url;
				} else {
					profiles.other = [...(profiles.other || []), url];
				}
			} catch {
				// Invalid URL, skip it
			}
			return profiles;
		},
		{} as Record<string, any>
	);
}

/**
 * Maps Google Places data to our Business interface
 * @param place Google Places API place data
 * @param searchQuery The original search query used
 * @returns Formatted business data
 */
function mapPlaceToBusiness(place: google.maps.places.PlaceResult, searchQuery: string): Business {
	const website = place.website;
	const websiteType = determineWebsiteType(website);
	const socialProfiles = extractSocialProfiles(place.url ? [place.url] : []);

	// Handle business status according to Google Places API
	let businessStatus: Business["businessStatus"] = "OPERATIONAL";
	if (place.business_status) {
		businessStatus = place.business_status as Business["businessStatus"];
	}

	// Analyze areas for improvement
	const improvements = {
		// No phone number listed
		needsPhone: !place.formatted_phone_number,

		// No or few photos (photos is undefined when no photos exist)
		needsPhotos: !place.photos || place.photos.length < 3,

		// Set needsSocialMedia to false since we're not displaying this badge anymore
		// The Google Places API typically doesn't provide reliable social media information
		needsSocialMedia: false,

		// No website or only platform presence
		needsWebsite: websiteType !== "legitimate",
	};

	// Filter out generic categories that don't provide useful information
	const genericCategories = [
		"point_of_interest",
		"establishment",
		"business",
		"place",
		"premise",
		"store",
		"local_business",
		"general_contractor",
		"political",
		"geocode",
		"route",
		"street_address",
		"intersection",
		"street_number",
		"subpremise",
		"postal_code",
		"natural_feature",
		"floor",
		"room",
		"postal_town",
		"neighborhood",
		"locality",
		"administrative_area_level_1",
		"administrative_area_level_2",
		"administrative_area_level_3",
		"administrative_area_level_4",
		"administrative_area_level_5",
		"country",
		"sublocality",
		"sublocality_level_1",
		"sublocality_level_2",
		"sublocality_level_3",
		"sublocality_level_4",
		"sublocality_level_5",
	];
	const filteredCategories = place.types?.filter((type) => !genericCategories.includes(type)) || [];

	// Log category filtering for debugging
	if (place.types && place.types.length > 0) {
		const removedCategories = place.types.filter((type) => genericCategories.includes(type));
		if (removedCategories.length > 0) {
			console.log(`Filtered out generic categories for ${place.name}:`, removedCategories);
		}
		console.log(`Remaining categories for ${place.name}:`, filteredCategories);
	}

	return {
		id: place.place_id!,
		name: place.name!,
		address: place.formatted_address!,
		location: {
			lat: place.geometry!.location!.lat(),
			lng: place.geometry!.location!.lng(),
		},
		category: filteredCategories,
		websiteType,
		websiteUrl: website,
		socialProfiles,
		phoneNumber: place.formatted_phone_number,
		lastUpdated: new Date(),
		searchQuery,
		businessStatus,
		improvements,
	};
}

/**
 * Searches for businesses using Google Places API
 * @param params Search parameters
 * @returns Search results with business data
 */
export async function searchBusinesses(params: SearchParameters): Promise<SearchResult> {
	const {
		location,
		radius,
		categories,
		excludeWebsiteTypes,
		websiteType,
		limit = 20,
		skip = 0,
	} = params;
	const targetResults = limit * 3; // Get 3x the requested limit to ensure we have enough after filtering

	// Initialize Places service
	const service = new google.maps.places.PlacesService(document.createElement("div"));

	// Convert location string to coordinates using Geocoding service
	const geocoder = new google.maps.Geocoder();
	const geocodeResult = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
		geocoder.geocode(
			{ address: location },
			(results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
				if (status === google.maps.GeocoderStatus.OK && results) {
					resolve(results);
				} else {
					reject(new Error(`Geocoding failed: ${status}`));
				}
			}
		);
	});

	const searchLocation = geocodeResult[0].geometry.location;

	// Determine search radii based on the selected radius
	// For larger radii, we'll make multiple searches with increasing radii
	// to ensure we get a cumulative set of results
	const searchRadii: number[] = [];

	// For small radii (≤ 2km), just use the selected radius
	if (radius <= 2000) {
		searchRadii.push(radius);
	}
	// For medium radii (2-10km), use a smaller radius first, then the selected radius
	else if (radius <= 10000) {
		searchRadii.push(Math.min(2000, radius / 2), radius);
	}
	// For large radii (> 10km), use multiple steps
	else {
		searchRadii.push(2000, 5000, 10000, radius);
	}

	console.log(`Searching with radii: ${searchRadii.join(", ")} meters`);

	// Track all places to avoid duplicates
	const allPlaces = new Map<string, google.maps.places.PlaceResult>();
	let totalCount = 0;

	// Search for each radius
	for (const searchRadius of searchRadii) {
		// Skip if we already have enough results
		if (allPlaces.size >= targetResults) {
			break;
		}

		// Perform the search
		const request: google.maps.places.PlaceSearchRequest = {
			location: searchLocation,
			radius: searchRadius,
			type: categories && categories.length === 1 ? categories[0] : undefined,
		};

		// If we have multiple categories or no categories, use a keyword search
		if (!request.type && categories && categories.length > 0) {
			request.keyword = categories.join(" ");
		}

		try {
			const results = await new Promise<google.maps.places.PlaceResult[]>((resolve, reject) => {
				service.nearbySearch(
					request,
					(
						results: google.maps.places.PlaceResult[] | null,
						status: google.maps.places.PlacesServiceStatus,
						pagination: google.maps.places.PlaceSearchPagination | null
					) => {
						if (status === google.maps.places.PlacesServiceStatus.OK && results) {
							resolve(results);
						} else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
							resolve([]);
						} else {
							reject(new Error(`Places search failed: ${status}`));
						}
					}
				);
			});

			// Add results to our collection, avoiding duplicates
			for (const place of results) {
				if (place.place_id && !allPlaces.has(place.place_id)) {
					allPlaces.set(place.place_id, place);
				}
			}

			totalCount += results.length;
			console.log(`Found ${results.length} places at radius ${searchRadius}m`);
		} catch (error) {
			console.error(`Error searching at radius ${searchRadius}:`, error);
		}
	}

	console.log(`Total unique places found: ${allPlaces.size}`);

	// Get detailed information for each place
	const detailedPlaces: google.maps.places.PlaceResult[] = [];

	for (const [placeId, basicPlace] of allPlaces.entries()) {
		// Skip if we already have enough detailed results
		if (detailedPlaces.length >= targetResults) {
			break;
		}

		try {
			const detailedPlace = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
				service.getDetails(
					{
						placeId,
						fields: [
							"name",
							"formatted_address",
							"geometry",
							"website",
							"url",
							"formatted_phone_number",
							"types",
							"business_status",
							"photos",
						],
					},
					(
						result: google.maps.places.PlaceResult | null,
						status: google.maps.places.PlacesServiceStatus
					) => {
						if (status === google.maps.places.PlacesServiceStatus.OK && result) {
							resolve(result);
						} else {
							reject(new Error(`Place details failed: ${status}`));
						}
					}
				);
			});

			detailedPlaces.push(detailedPlace);
		} catch (error) {
			console.error(`Error getting details for place ${placeId}:`, error);
		}
	}

	// Map places to our business model and filter based on criteria
	const businesses = detailedPlaces
		.map((place) => mapPlaceToBusiness(place, location))
		.filter((business) => {
			// Filter out permanently closed businesses
			if (business.businessStatus === "PERMANENTLY_CLOSED") {
				return false;
			}

			// Filter by specific website type if specified
			if (websiteType) {
				return business.websiteType === websiteType;
			}

			// Filter by excluded website types if specified
			if (excludeWebsiteTypes && excludeWebsiteTypes.length > 0) {
				return !excludeWebsiteTypes.includes(business.websiteType);
			}

			return true;
		});

	// Sort businesses by relevance (currently just the order returned by the API)
	// In the future, we could implement more sophisticated sorting

	// Get total count before pagination
	const totalFilteredCount = businesses.length;

	// Apply pagination
	const paginatedBusinesses = businesses.slice(skip, skip + limit);

	return {
		businesses: paginatedBusinesses,
		totalCount: allPlaces.size,
		hasMore: totalFilteredCount > skip + limit,
	};
}
