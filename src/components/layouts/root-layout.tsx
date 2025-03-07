import "@/styles/globals.css";
import Head from "next/head";
import Script from "next/script";

import { Space_Grotesk as FontSans, Noto_Serif as FontSerif } from "next/font/google";

import { ErrorToast } from "@/components/primitives/error-toast";
import { JsonLd } from "@/components/primitives/json-ld";
import { AnalyticsProvider } from "@/components/providers/analytics-provider";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TRPCReactProvider } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";
import HolyLoader from "holy-loader";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { ViewTransitions } from "next-view-transitions";
import { type ReactNode, Suspense } from "react";
import { PageTracker } from "react-page-tracker";

const fontSerif = FontSerif({
	weight: ["400", "500", "600", "700"],
	style: ["normal", "italic"],
	subsets: ["latin"],
	variable: "--font-serif",
});

const fontSans = FontSans({
	display: "swap",
	subsets: ["latin"],
	variable: "--font-sans",
});

export function RootLayout({ children }: { children: ReactNode }) {
	return (
		<ViewTransitions>
			<Head>
				{/* React Scan */}
				<script src="https://unpkg.com/react-scan/dist/auto.global.js" async />
			</Head>
			<html lang="en" suppressHydrationWarning>
				<head>
					<Script
						src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
						strategy="beforeInteractive"
						nonce="google-maps-nonce"
						crossOrigin="anonymous"
					/>
				</head>
				<body
					className={cn(
						"min-h-screen antialiased",
						"font-sans font-normal leading-relaxed",
						fontSans.variable,
						fontSerif.variable
					)}
				>
					<JsonLd organization website />
					<HolyLoader
						showSpinner
						height={"4px"}
						color={"linear-gradient(90deg, #FF61D8, #8C52FF, #5CE1E6, #FF61D8)"}
					/>
					<PageTracker />
					<SessionProvider>
						<TRPCReactProvider>
							<ThemeProvider attribute="class" defaultTheme="dark">
								<TooltipProvider delayDuration={100}>
									<AnalyticsProvider>
										{/* Content */}
										{children}


										{/* Toast - Display messages to the user */}
										<SonnerToaster />

										{/* Error Toast - Display error messages to the user based on search params */}
										<Suspense>
											<ErrorToast />
										</Suspense>
									</AnalyticsProvider>
								</TooltipProvider>
							</ThemeProvider>
						</TRPCReactProvider>
					</SessionProvider>
				</body>
			</html>
		</ViewTransitions>
	);
}
