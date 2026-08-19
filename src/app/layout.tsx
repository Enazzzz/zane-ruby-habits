import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
	subsets: ["latin"],
	variable: "--font-nunito",
	weight: ["600", "700", "800", "900"],
});

export const metadata: Metadata = {
	metadataBase: new URL(
		process.env.VERCEL_PROJECT_PRODUCTION_URL
			? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
			: "http://localhost:3000",
	),
	title: "Zane & Ruby · Call Streak",
	description:
		"A shared Duolingo-style board for Zane and Ruby: daily calls, status, thinking-of-you pings, questions, and a bucket list.",
	applicationName: "Zane & Ruby Calls",
	robots: { index: false, follow: false },
	appleWebApp: {
		capable: true,
		title: "Zane & Ruby",
		statusBarStyle: "black-translucent",
	},
};

export const viewport: Viewport = {
	themeColor: "#131f24",
	width: "device-width",
	initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html lang="en" className={nunito.variable}>
			<body className="antialiased">{children}</body>
		</html>
	);
}
