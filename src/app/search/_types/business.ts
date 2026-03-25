export interface Location {
	lat: number;
	lng: number;
}

export type WebsiteType = "none" | "facebook" | "yelp" | "other" | "legitimate";

// Match exact Google Places API business_status values
// https://developers.google.com/maps/documentation/places/web-service/details#PlaceOpeningHours
export type BusinessStatus =
	| "OPERATIONAL"
	| "TEMPORARILY_CLOSED"
	| "PERMANENTLY_CLOSED"
	| undefined; // For cases where the status is not provided

export interface SocialProfiles {
	facebook?: string;
	yelp?: string;
	instagram?: string;
	other?: string[];
}

export interface Business {
	id: string;
	name: string;
	address: string;
	location: Location;
	category: string[];
	websiteType: WebsiteType;
	websiteUrl?: string;
	socialProfiles: SocialProfiles;
	phoneNumber?: string;
	lastUpdated: Date;
	searchQuery: string;
	businessStatus: BusinessStatus;
	// Improvement flags
	improvements: {
		needsPhone: boolean; // No phone number listed
		needsPhotos: boolean; // No or few photos
		needsSocialMedia: boolean; // Missing key social media presence
		needsWebsite: boolean; // No website or only platform presence
	};
}

export interface SearchParameters {
	location: string;
	radius: number;
	categories?: string[];
	excludeWebsiteTypes?: WebsiteType[];
	websiteType?: WebsiteType;
	limit?: number;
	skip?: number;
	sortBy?: "distance" | "relevance" | "rating";
}

export interface SearchResult {
	businesses: Business[];
	totalCount: number;
	hasMore: boolean;
	nextPageToken?: string;
}
