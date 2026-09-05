import { createFileRoute } from "@tanstack/react-router";
import Portfolio from "#/components/portfolio";

export const Route = createFileRoute("/about")({
	component: AboutPage,
});

function AboutPage() {
	return <Portfolio aboutPage />;
}
