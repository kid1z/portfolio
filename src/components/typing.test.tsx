import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import gsap from "gsap";
import { renderToString } from "react-dom/server";
import OldIntro from "./old-intro";
import IntroGreeting from "./typing";

function mockMotion(reduced = false) {
	const query = {
		matches: reduced,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	};
	vi.stubGlobal(
		"matchMedia",
		vi.fn(() => query),
	);
	return query;
}

function advanceUntil(condition: () => boolean) {
	for (let step = 0; step < 400 && !condition(); step++) {
		act(() => vi.advanceTimersByTime(25));
	}
	expect(condition()).toBe(true);
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.spyOn(Math, "random").mockReturnValue(0);
	mockMotion();
	sessionStorage.clear();
	window.history.replaceState({}, "", "/");
});

afterEach(() => {
	cleanup();
	document.body.style.overflow = "";
	vi.useRealTimers();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("portfolio greeting", () => {
	it("includes the intro in server HTML instead of waiting for an effect to mount it", () => {
		const html = renderToString(<IntroGreeting replayKey={0} />);
		expect(html).toContain('data-intro-phase="pending"');
		expect(html).toContain('role="dialog"');
		expect(html).toContain("bg-black");
	});

	it("plays OldIntro's complete greeting cycle before revealing the portfolio", () => {
		render(<IntroGreeting replayKey={0} />);
		expect(screen.getByRole("dialog")).toBeTruthy();
		act(() => vi.advanceTimersByTime(55));
		expect(screen.getByText("X")).toBeTruthy();
		expect(screen.getByText("X").className).toContain("text-[34px]");
		for (const phrase of [
			"Xin chào",
			"Hello",
			"こんにちは",
			"안녕하세요",
			"Bonjour",
		]) {
			advanceUntil(() => screen.queryByText(phrase) !== null);
			expect(screen.getByRole("dialog")).toBeTruthy();
		}
		advanceUntil(() => screen.queryByRole("dialog") === null);
		expect(document.body.style.overflow).toBe("");
	});

	it("preserves OldIntro's standalone loop when no completion callback is supplied", () => {
		render(<OldIntro />);
		advanceUntil(() => screen.queryByText("Bonjour") !== null);
		advanceUntil(() => screen.queryByText("Xin chào") !== null);
	});

	it("can be skipped without waiting for the animation", () => {
		render(<IntroGreeting replayKey={0} />);
		fireEvent.click(screen.getByRole("button", { name: "Skip intro" }));
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("can be dismissed with Escape", () => {
		render(<IntroGreeting replayKey={0} />);
		fireEvent.keyDown(window, { key: "Escape" });
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("does not repeat during a session unless replay is requested", () => {
		sessionStorage.setItem("hiep-intro-seen", "true");
		const { rerender } = render(<IntroGreeting replayKey={0} />);
		expect(screen.queryByRole("dialog")).toBeNull();
		rerender(<IntroGreeting replayKey={1} />);
		expect(screen.getByRole("dialog")).toBeTruthy();
		advanceUntil(() => screen.queryByText("Xin chào") !== null);
		fireEvent.click(screen.getByRole("button", { name: "Skip intro" }));
		rerender(<IntroGreeting replayKey={2} />);
		expect(screen.queryByText("Xin chào")).toBeNull();
		advanceUntil(() => screen.queryByText("Xin chào") !== null);
	});

	it("skips the intro for reduced motion", () => {
		mockMotion(true);
		const { rerender } = render(<IntroGreeting replayKey={0} />);
		expect(screen.queryByRole("dialog")).toBeNull();
		rerender(<IntroGreeting replayKey={1} />);
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("dismisses the animation when reduced motion is enabled and removes its listener", () => {
		const query = mockMotion();
		render(<IntroGreeting replayKey={0} />);
		const onChange = query.addEventListener.mock.calls[0][1];
		act(() => {
			query.matches = true;
			onChange();
		});
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(document.body.style.overflow).toBe("");
		expect(query.removeEventListener).toHaveBeenCalledWith("change", onChange);
	});

	it("does not interrupt a direct section link", () => {
		window.history.replaceState({}, "", "/#work");
		render(<IntroGreeting replayKey={0} />);
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("makes background content inert and restores focus after skipping", () => {
		document.body.style.overflow = "auto";
		render(
			<>
				<div id="portfolio-content">
					<main tabIndex={-1}>Portfolio</main>
				</div>
				<IntroGreeting replayKey={0} />
			</>,
		);
		expect(document.getElementById("portfolio-content")?.inert).toBe(true);
		act(() => vi.advanceTimersByTime(50));
		expect(document.activeElement).toBe(
			screen.getByRole("button", { name: "Skip intro" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Skip intro" }));
		expect(document.getElementById("portfolio-content")?.inert).toBe(true);
		expect(screen.getByRole("dialog").dataset.introPhase).toBe("leaving");
		act(() => {
			gsap.getById("portfolio-intro-reveal")?.progress(1);
		});
		expect(document.getElementById("portfolio-content")?.inert).toBe(false);
		expect(document.activeElement).toBe(screen.getByRole("main"));
		expect(document.body.style.overflow).toBe("auto");
	});

	it("reverts a running reveal immediately when reduced motion is enabled", () => {
		const query = mockMotion();
		render(
			<>
				<IntroGreeting replayKey={0} />
				<div id="portfolio-content">
					<main tabIndex={-1}>Portfolio</main>
				</div>
			</>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Skip intro" }));
		expect(gsap.getById("portfolio-intro-reveal")).toBeTruthy();
		act(() => {
			query.matches = true;
			query.addEventListener.mock.calls[0][1]();
		});
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(gsap.getById("portfolio-intro-reveal")).toBeUndefined();
		expect(document.getElementById("portfolio-content")?.style.opacity).toBe(
			"",
		);
		expect(document.getElementById("portfolio-content")?.inert).toBe(false);
	});

	it("restores the replay trigger's focus and scroll state on unmount", () => {
		render(
			<div id="portfolio-content">
				<button type="button">Replay intro</button>
			</div>,
		);
		const trigger = screen.getByRole("button", { name: "Replay intro" });
		trigger.focus();
		const { unmount } = render(<IntroGreeting replayKey={1} />);
		act(() => vi.advanceTimersByTime(50));
		expect(document.activeElement).toBe(
			screen.getByRole("button", { name: "Skip intro" }),
		);
		unmount();
		expect(document.activeElement).toBe(trigger);
		expect(document.getElementById("portfolio-content")?.inert).toBe(false);
		expect(document.body.style.overflow).toBe("");
	});

	it("still completes when session storage is unavailable", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new DOMException("Access denied", "SecurityError");
		});
		const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
		render(<IntroGreeting replayKey={0} />);
		advanceUntil(() => screen.queryByRole("dialog") === null);
		expect(warning).toHaveBeenCalledOnce();
	});
});
