"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { searchBusinesses } from "../_services/maps";
import type { Business, SearchResult } from "../_types/business";

export const ResultsList = () => {
	const searchParams = useSearchParams();
	const [results, setResults] = useState<SearchResult | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
	const ITEMS_PER_PAGE = 20;

	useEffect(() => {
		if (!searchParams) return;

		const location = searchParams.get("location");
		if (!location) return;

		// Reset pagination when search parameters change
		setPage(1);
		setAllBusinesses([]);

		const fetchResults = async () => {
			setIsLoading(true);
			setError(null);

			try {
				const category = searchParams.get("category");
				const websiteType = searchParams.get("websiteType");
				const radius = searchParams.get("radius");

				const searchResult = await searchBusinesses({
					location,
					radius: Number.parseInt(radius || "5000"),
					categories: category && category !== "all" ? [category] : undefined,
					websiteType: websiteType && websiteType !== "all" ? websiteType as any : undefined,
					limit: ITEMS_PER_PAGE,
				});
				setResults(searchResult);
				setAllBusinesses(searchResult.businesses);
			} catch (err) {
				setError(err instanceof Error ? err.message : "An error occurred");
				console.error("Search error:", err);
			} finally {
				setIsLoading(false);
			}
		};

		fetchResults();
	}, [searchParams]);

	const handleLoadMore = async () => {
		if (!results || !searchParams) return;

		setIsLoading(true);

		try {
			const location = searchParams.get("location");
			const category = searchParams.get("category");
			const websiteType = searchParams.get("websiteType");
			const radius = searchParams.get("radius");

			const nextPage = page + 1;
			const offset = page * ITEMS_PER_PAGE;

			const searchResult = await searchBusinesses({
				location: location || "",
				radius: Number.parseInt(radius || "5000"),
				categories: category && category !== "all" ? [category] : undefined,
				websiteType: websiteType && websiteType !== "all" ? websiteType as any : undefined,
				limit: ITEMS_PER_PAGE,
				skip: offset,
			});

			// Combine the new businesses with the existing ones
			const updatedBusinesses = [...allBusinesses, ...searchResult.businesses];
			setAllBusinesses(updatedBusinesses);

			// Update the results with the combined businesses
			setResults({
				...searchResult,
				businesses: updatedBusinesses,
				hasMore: searchResult.hasMore && searchResult.businesses.length > 0,
			});

			setPage(nextPage);
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred loading more results");
			console.error("Load more error:", err);
		} finally {
			setIsLoading(false);
		}
	};

	if (isLoading && !results) {
		return (
			<div className="flex items-center justify-center min-h-[200px]">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
			</div>
		);
	}

	if (error) {
		return (
			<Card className="bg-destructive/10">
				<CardHeader>
					<CardTitle>Error</CardTitle>
					<CardDescription>{error}</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	if (!results) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>No Results</CardTitle>
					<CardDescription>
						Enter a location and search parameters to find businesses.
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">
					Found {results.businesses.length} businesses
					{results.totalCount > results.businesses.length && (
						<span className="text-muted-foreground text-sm ml-2">
							(filtered from {results.totalCount} total)
						</span>
					)}
				</h2>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{allBusinesses.map((business) => (
					<BusinessCard key={business.id} business={business} />
				))}
			</div>

			{results.hasMore && (
				<div className="flex justify-center mt-8">
					<button
						type="button"
						className="text-primary hover:underline flex items-center gap-2"
						onClick={handleLoadMore}
						disabled={isLoading}
					>
						{isLoading ? (
							<>
								<span className="animate-spin h-4 w-4 border-b-2 border-primary rounded-full" />
								Loading...
							</>
						) : (
							'Load More'
						)}
					</button>
				</div>
			)}
		</div>
	);
};

const BusinessCard = ({ business }: { business: Business }) => {
	const getStatusDisplay = () => {
		switch (business.businessStatus) {
			case "TEMPORARILY_CLOSED":
				return <span className="text-yellow-600 font-medium block">⚠️ Temporarily Closed</span>;
			case "PERMANENTLY_CLOSED":
				return null; // These should be filtered out already
			default:
				return null;
		}
	};

	const getImprovementBadges = () => {
		const badges = [];

		if (business.improvements.needsPhone) {
			badges.push(
				<Badge
					key="phone"
					variant="outline"
					className="bg-yellow-50 text-yellow-700 border-yellow-200"
				>
					Needs Phone
				</Badge>
			);
		}

		if (business.improvements.needsPhotos) {
			badges.push(
				<Badge
					key="photos"
					variant="outline"
					className="bg-orange-50 text-orange-700 border-orange-200"
				>
					Needs Photos
				</Badge>
			);
		}

		if (business.improvements.needsWebsite) {
			badges.push(
				<Badge
					key="website"
					variant="outline"
					className="bg-purple-50 text-purple-700 border-purple-200"
				>
					Needs Website
				</Badge>
			);
		}

		return badges;
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between">
					<div>
						<CardTitle className="line-clamp-2">{business.name}</CardTitle>
						<CardDescription className="line-clamp-2 mt-1">
							{business.address}
							{getStatusDisplay()}
						</CardDescription>
					</div>
					<WebsiteTypeBadge type={business.websiteType} />
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{business.category.length > 0 && (
						<div className="flex flex-wrap gap-2">
							{business.category.map((cat) => (
								<Badge key={cat} variant="secondary" className="mr-2">
									{cat.replace(/_/g, " ")}
								</Badge>
							))}
						</div>
					)}

					{business.phoneNumber && (
						<p className="text-sm text-muted-foreground">{business.phoneNumber}</p>
					)}

					{business.websiteUrl && (
						<a
							href={business.websiteUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="text-sm text-primary hover:underline block truncate"
						>
							{business.websiteUrl}
						</a>
					)}

					<div className="flex flex-wrap gap-2 mt-4">{getImprovementBadges()}</div>
				</div>
			</CardContent>
		</Card>
	);
};

const WebsiteTypeBadge = ({ type }: { type: Business["websiteType"] }) => {
	const variants: Record<Business["websiteType"], any> = {
		none: { className: "bg-destructive/10 text-destructive", label: "No Website" },
		facebook: {
			className: "bg-blue-100 text-blue-800",
			label: "Facebook Only",
		},
		yelp: { className: "bg-red-100 text-red-800", label: "Yelp Only" },
		other: {
			className: "bg-orange-100 text-orange-800",
			label: "Other Platform",
		},
		legitimate: {
			className: "bg-green-100 text-green-800",
			label: "Has Website",
		},
	};

	// Don't show badge for legitimate websites or none (no website)
	if (type === "legitimate" || type === "none") {
		return null;
	}

	const { className, label } = variants[type];

	return <Badge className={className}>{label}</Badge>;
};
