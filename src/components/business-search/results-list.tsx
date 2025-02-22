'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Business, SearchResult } from '@/types/business';
import { searchBusinesses } from '@/lib/services/maps';

export const ResultsList = () => {
    const searchParams = useSearchParams();
    const [results, setResults] = useState<SearchResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!searchParams) return;

        const location = searchParams.get('location');
        if (!location) return;

        const fetchResults = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const category = searchParams.get('category');
                const websiteType = searchParams.get('websiteType');
                const radius = searchParams.get('radius');

                const searchResult = await searchBusinesses({
                    location,
                    radius: parseInt(radius || '5000'),
                    categories: category ? [category] : undefined,
                    excludeWebsiteTypes: websiteType ? [websiteType as any] : undefined,
                });
                setResults(searchResult);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
                console.error('Search error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchResults();
    }, [searchParams]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                    Found {results.totalCount} businesses
                </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {results.businesses.map((business) => (
                    <BusinessCard key={business.id} business={business} />
                ))}
            </div>

            {results.hasMore && (
                <div className="flex justify-center mt-8">
                    <button className="text-primary hover:underline">Load More</button>
                </div>
            )}
        </div>
    );
};

const BusinessCard = ({ business }: { business: Business }) => {
    const getStatusDisplay = () => {
        switch (business.businessStatus) {
            case 'TEMPORARILY_CLOSED':
                return (
                    <span className="text-yellow-600 font-medium block">
                        ⚠️ Temporarily Closed
                    </span>
                );
            case 'PERMANENTLY_CLOSED':
                return null; // These should be filtered out already
            case 'OPERATIONAL':
            case undefined:
            default:
                return null;
        }
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
                <div className="space-y-2">
                    {business.category.map((cat) => (
                        <Badge key={cat} variant="secondary" className="mr-2">
                            {cat.replace(/_/g, ' ')}
                        </Badge>
                    ))}
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
                </div>
            </CardContent>
        </Card>
    );
};

const WebsiteTypeBadge = ({ type }: { type: Business['websiteType'] }) => {
    const variants: Record<Business['websiteType'], any> = {
        none: { className: 'bg-destructive/10 text-destructive', label: 'No Website' },
        facebook: {
            className: 'bg-blue-100 text-blue-800',
            label: 'Facebook Only',
        },
        yelp: { className: 'bg-red-100 text-red-800', label: 'Yelp Only' },
        other: {
            className: 'bg-orange-100 text-orange-800',
            label: 'Other Platform',
        },
        legitimate: {
            className: 'bg-green-100 text-green-800',
            label: 'Has Website',
        },
    };

    // Don't show badge for legitimate websites
    if (type === 'legitimate') {
        return null;
    }

    const { className, label } = variants[type];

    return <Badge className={className}>{label}</Badge>;
};
