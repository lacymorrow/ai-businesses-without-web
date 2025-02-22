'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { WebsiteType } from '@/types/business';

const RADIUS_OPTIONS = [
    { value: '1000', label: '1 km' },
    { value: '2000', label: '2 km' },
    { value: '5000', label: '5 km' },
    { value: '10000', label: '10 km' },
    { value: '20000', label: '20 km' },
    { value: '50000', label: '50 km' },
];

const BUSINESS_CATEGORIES = [
    { value: 'restaurant', label: 'Restaurants' },
    { value: 'store', label: 'Retail Stores' },
    { value: 'beauty_salon', label: 'Beauty Salons' },
    { value: 'gym', label: 'Gyms' },
    { value: 'cafe', label: 'Cafes' },
    { value: 'bar', label: 'Bars' },
];

const WEBSITE_TYPES: { value: WebsiteType; label: string }[] = [
    { value: 'none', label: 'No Website' },
    { value: 'facebook', label: 'Facebook Only' },
    { value: 'yelp', label: 'Yelp Only' },
    { value: 'other', label: 'Other Platform Only' },
    { value: 'legitimate', label: 'Has Own Website' },
];

export const SearchForm = () => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const [location, setLocation] = useQueryState('location');
    const [radius, setRadius] = useQueryState('radius', {
        defaultValue: '5000',
    });
    const [category, setCategory] = useQueryState('category');
    const [websiteType, setWebsiteType] = useQueryState('websiteType', {
        defaultValue: 'none',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // The URL parameters will be automatically updated by nuqs
            // which will trigger a re-render of the results component
            router.push(`/search?${new URLSearchParams({
                location: location || '',
                radius: radius || '5000',
                category: category || '',
                websiteType: websiteType || 'none',
            }).toString()}`);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                        id="location"
                        placeholder="Enter city, address, or area"
                        value={location || ''}
                        onChange={(e) => setLocation(e.target.value)}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="radius">Search Radius</Label>
                    <Select
                        value={radius || '5000'}
                        onValueChange={(value) => setRadius(value)}
                    >
                        <SelectTrigger id="radius">
                            <SelectValue placeholder="Select distance" />
                        </SelectTrigger>
                        <SelectContent>
                            {RADIUS_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="category">Business Category</Label>
                    <Select value={category || ''} onValueChange={setCategory}>
                        <SelectTrigger id="category">
                            <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                            {BUSINESS_CATEGORIES.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="websiteType">Website Status</Label>
                    <Select
                        value={websiteType || 'none'}
                        onValueChange={(value) => setWebsiteType(value as WebsiteType)}
                    >
                        <SelectTrigger id="websiteType">
                            <SelectValue placeholder="Select website status" />
                        </SelectTrigger>
                        <SelectContent>
                            {WEBSITE_TYPES.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Searching...' : 'Search Businesses'}
            </Button>
        </form>
    );
};
