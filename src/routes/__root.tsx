import {
	createRootRoute,
	HeadContent,
	Link,
	Scripts,
} from "@tanstack/react-router";
import { introBootstrap } from "../lib/intro-preference";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Hiep Tran | Developer & Curious Maker",
			},
			{
				name: "description",
				content:
					"Hiep Tran is a software developer from Vietnam, building thoughtful web experiences, open-source tools, and playful Three.js experiments.",
			},
			{
				property: "og:title",
				content: "Hiep Tran | Developer & Curious Maker",
			},
			{
				property: "og:description",
				content:
					"Good code. A curious mind. Explore my projects, open-source tools, and interactive 3D playground.",
			},
			{ property: "og:type", content: "website" },
			{ name: "theme-color", content: "#f3f2ee" },
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
			{ rel: "manifest", href: "/manifest.json" },
		],
	}),
	notFoundComponent: NotFound,
	shellComponent: RootDocument,
});

function NotFound() {
	return (
		<main className="not-found">
			<div>
				<p>404</p>
				<h1>Nothing here. Yet.</h1>
				<p>
					The route you requested does not exist. Return home to continue
					browsing.
				</p>
				<div className="mt-8">
					<Link to="/" className="button button-primary">
						Go home
					</Link>
				</div>
			</div>
		</main>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				{/** biome-ignore lint/security/noDangerouslySetInnerHtml: <can use> */}
				<script dangerouslySetInnerHTML={{ __html: introBootstrap }} />
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}
