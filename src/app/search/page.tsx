import { Suspense } from 'react';
import { ResultsList } from './_components/results-list';
import { SearchForm } from './_components/search-form';

export const metadata = {
	title: 'Business Website Opportunity Finder',
	description: 'Find businesses that need a website in your area',
};

export default function SearchPage() {
	return (
		<main className="container mx-auto py-8 px-4">
			<div className="max-w-4xl mx-auto space-y-8">
				<div className="text-center">
					<h1 className="text-4xl font-bold tracking-tight">
						Business Website Opportunity Finder
					</h1>
					<p className="mt-4 text-lg text-muted-foreground">
						Find businesses in your area that could benefit from a professional website.
					</p>
				</div>

				<div className="bg-card rounded-lg border p-6">
					<SearchForm />
				</div>

				<Suspense
					fallback={
						<div className="flex items-center justify-center min-h-[200px]">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
						</div>
					}
				>
					<ResultsList />
				</Suspense>
			</div>
		</main>
	);
}
