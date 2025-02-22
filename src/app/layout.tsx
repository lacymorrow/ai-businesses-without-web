import { NuqsAdapter } from 'nuqs/adapters/next/app'
import type { Metadata } from "next";
import type React from "react";
import Script from 'next/script';

import { RootLayout } from "@/components/layouts/root-layout";
import { metadata as defaultMetadata } from "@/config/metadata";

export const metadata: Metadata = defaultMetadata;

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<RootLayout>
			<NuqsAdapter>
				{children}
			</NuqsAdapter>
		</RootLayout>
	);
}
