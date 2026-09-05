import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import gsap from "gsap";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { profile, projects } from "#/lib/profile";
import Portfolio from "./portfolio";

const { navigate, router } = vi.hoisted(() => ({
	navigate: vi.fn(({ hash }: { hash: string }) => {
		window.history.pushState(window.history.state, "", `#${hash}`);
		return Promise.resolve();
	}),
	router: {
		subscribe: vi.fn((_event: string, _callback: () => void) => vi.fn()),
	},
}));

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => navigate,
	useRouter: () => router,
}));

vi.mock("./sculpture", () => ({
	default: ({ dark }: { dark: boolean }) => (
		<div data-testid="sculpture" data-dark={dark} />
	),
}));

vi.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: {} }));
vi.mock("gsap/ScrollSmoother", () => ({
	ScrollSmoother: {
		create: vi.fn(() => ({
			paused: vi.fn(),
			scrollTo: vi.fn(),
			kill: vi.fn(),
		})),
	},
}));

let reducedMotion = false;
let finePointer = true;

beforeEach(() => {
	vi.clearAllMocks();
	reducedMotion = false;
	finePointer = true;
	window.history.replaceState({}, "", "/");
	sessionStorage.setItem("hiep-intro-seen", "true");
	vi.stubGlobal(
		"matchMedia",
		vi.fn((query: string) => ({
			get matches() {
				if (
					query ===
					"(prefers-reduced-motion: no-preference) and (pointer: fine)"
				)
					return !reducedMotion && finePointer;
				if (query === "(prefers-reduced-motion: reduce)") return reducedMotion;
				return false;
			},
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})),
	);
	vi.stubGlobal(
		"IntersectionObserver",
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	);
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("portfolio", () => {
	it("renders the complete portfolio and its real projects", () => {
		render(<Portfolio />);
		expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
			"Good code.A curious mind.",
		);
		for (const project of projects) {
			const heading = screen.getByRole("heading", { name: project.name });
			expect(heading.querySelector("a")?.href).toBe(project.url);
		}
		for (const id of ["work", "about", "contact"]) {
			expect(document.getElementById(id)).toBeTruthy();
		}
	});

	it("connects contact actions to the supplied LinkedIn profile", () => {
		render(<Portfolio />);
		expect(
			screen.getByRole("link", { name: "Get in touch" }).getAttribute("href"),
		).toBe(profile.linkedin);
		for (const link of screen.getAllByRole("link", { name: "GitHub" })) {
			expect(link.getAttribute("href")).toBe(profile.github);
		}
	});

	it("updates both the page theme and the sculpture", () => {
		render(<Portfolio />);
		fireEvent.click(
			screen.getByRole("button", { name: "Switch to dark theme" }),
		);
		expect(document.documentElement.dataset.theme).toBe("dark");
		expect(screen.getByTestId("sculpture").dataset.dark).toBe("true");
		fireEvent.click(
			screen.getByRole("button", { name: "Switch to light theme" }),
		);
		expect(document.documentElement.dataset.theme).toBe("light");
	});

	it("replays the intro from the footer and restores focus when skipped", () => {
		render(<Portfolio />);
		const replay = screen.getByRole("button", { name: "Replay intro" });
		replay.focus();
		fireEvent.click(replay);
		expect(screen.getByRole("dialog")).toBeTruthy();
		expect(document.getElementById("portfolio-content")?.inert).toBe(true);
		fireEvent.click(screen.getByRole("button", { name: "Skip intro" }));
		expect(screen.getByRole("dialog").dataset.introPhase).toBe("leaving");
		act(() => {
			gsap.getById("portfolio-intro-reveal")?.progress(1);
		});
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(document.activeElement).toBe(replay);
		expect(document.getElementById("portfolio-content")?.inert).toBe(false);
	});

	it("starts ScrollSmoother only after the intro reveal and keeps the gate outside its transform", () => {
		sessionStorage.clear();
		render(<Portfolio />);
		expect(ScrollSmoother.create).not.toHaveBeenCalled();
		expect(screen.getByRole("dialog").closest("#smooth-wrapper")).toBeNull();
		expect(
			screen
				.getByRole("link", { name: "Skip to content", hidden: true })
				.closest("#smooth-wrapper"),
		).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Skip intro" }));
		expect(ScrollSmoother.create).not.toHaveBeenCalled();
		act(() => {
			gsap.getById("portfolio-intro-reveal")?.progress(1);
		});
		expect(ScrollSmoother.create).toHaveBeenCalledOnce();
		expect(ScrollSmoother.create).toHaveBeenCalledWith(
			expect.objectContaining({
				wrapper: document.getElementById("smooth-wrapper"),
				content: document.getElementById("smooth-content"),
				smooth: 1.1,
				smoothTouch: false,
			}),
		);
	});

	it("pauses smoothing during replay and tears it down on unmount", () => {
		const { unmount } = render(<Portfolio />);
		const smoother = vi.mocked(ScrollSmoother.create).mock.results[0].value;
		fireEvent.click(screen.getByRole("button", { name: "Replay intro" }));
		expect(smoother.paused).toHaveBeenLastCalledWith(true);
		fireEvent.keyDown(window, { key: "Escape" });
		act(() => {
			gsap.getById("portfolio-intro-reveal")?.progress(1);
		});
		expect(smoother.paused).toHaveBeenLastCalledWith(false);
		unmount();
		expect(smoother.kill).toHaveBeenCalledOnce();
	});

	it("uses native scrolling for reduced motion and releases smoothing when the preference changes", () => {
		reducedMotion = true;
		const first = render(<Portfolio />);
		expect(ScrollSmoother.create).not.toHaveBeenCalled();
		first.unmount();
		reducedMotion = false;
		render(<Portfolio />);
		const smoother = vi.mocked(ScrollSmoother.create).mock.results[0].value;
		act(() => {
			reducedMotion = true;
			gsap.matchMediaRefresh();
		});
		expect(smoother.kill).toHaveBeenCalledOnce();
	});

	it("keeps touch-only devices on native scrolling", () => {
		finePointer = false;
		render(<Portfolio />);
		expect(ScrollSmoother.create).not.toHaveBeenCalled();
	});

	it("preserves section links, URL history, focus and direct anchor visits", () => {
		window.history.replaceState({}, "", "/#about");
		render(<Portfolio />);
		const smoother = vi.mocked(ScrollSmoother.create).mock.results[0].value;
		expect(smoother.scrollTo).toHaveBeenCalledWith(
			document.getElementById("about"),
			false,
			expect.any(String),
		);
		fireEvent.click(screen.getByRole("link", { name: "Work" }));
		expect(window.location.hash).toBe("#work");
		expect(navigate).toHaveBeenCalledWith({
			hash: "work",
			resetScroll: false,
			hashScrollIntoView: false,
		});
		expect(document.activeElement).toBe(document.getElementById("work"));
		expect(smoother.scrollTo).toHaveBeenLastCalledWith(
			document.getElementById("work"),
			true,
			expect.any(String),
		);
		window.history.replaceState({}, "", "/#contact");
		fireEvent(window, new HashChangeEvent("hashchange"));
		expect(smoother.scrollTo).toHaveBeenLastCalledWith(
			document.getElementById("contact"),
			false,
			expect.any(String),
		);
	});

	it("positions the about route after the router's own scroll restoration", () => {
		window.history.replaceState({}, "", "/about");
		render(<Portfolio aboutPage />);
		const smoother = vi.mocked(ScrollSmoother.create).mock.results[0].value;
		const wrapper = document.getElementById("smooth-wrapper");
		if (!wrapper) throw new Error("Missing smooth wrapper");
		wrapper.scrollTop = 100;
		act(() => router.subscribe.mock.calls[0][1]());
		expect(wrapper.scrollTop).toBe(0);
		expect(smoother.scrollTo).toHaveBeenLastCalledWith(
			document.getElementById("about"),
			false,
			expect.any(String),
		);
	});

	it("provides safe external links and descriptive project image alternatives", () => {
		render(<Portfolio />);
		for (const link of document.querySelectorAll<HTMLAnchorElement>(
			'a[target="_blank"]',
		)) {
			expect(link.rel).toContain("noreferrer");
			expect(link.href).toMatch(/^https:\/\//);
		}
		for (const project of projects) {
			expect(screen.getByAltText(project.imageAlt)).toBeTruthy();
		}
	});
});
