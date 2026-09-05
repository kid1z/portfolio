import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { introBootstrap, shouldPlayIntro } from "./intro-preference";

beforeEach(() => {
	sessionStorage.clear();
	window.history.replaceState({}, "", "/");
	vi.stubGlobal(
		"matchMedia",
		vi.fn(() => ({ matches: false })),
	);
});

afterEach(() => {
	delete document.documentElement.dataset.intro;
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("first-paint intro preference", () => {
	it("selects the intro before hydration without marking it as already played", () => {
		window.eval(introBootstrap);
		expect(document.documentElement.dataset.intro).toBe("play");
		expect(sessionStorage.getItem("hiep-intro-seen")).toBeNull();
		expect(shouldPlayIntro()).toBe(true);
	});

	it("bypasses returning sessions before the first paint while allowing replay", () => {
		sessionStorage.setItem("hiep-intro-seen", "true");
		window.eval(introBootstrap);
		expect(document.documentElement.dataset.intro).toBe("skip");
		expect(shouldPlayIntro()).toBe(false);
		expect(shouldPlayIntro(true)).toBe(true);
	});

	it("bypasses direct section links and other routes", () => {
		for (const path of ["/#work", "/about", "/not-found"]) {
			window.history.replaceState({}, "", path);
			window.eval(introBootstrap);
			expect(document.documentElement.dataset.intro).toBe("skip");
			expect(shouldPlayIntro()).toBe(false);
		}
	});

	it("bypasses all intro motion when reduced motion is requested", () => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({ matches: true })),
		);
		window.eval(introBootstrap);
		expect(document.documentElement.dataset.intro).toBe("skip");
		expect(shouldPlayIntro(true)).toBe(false);
	});

	it("still protects first paint if session storage is blocked", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new DOMException("Access denied", "SecurityError");
		});
		const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
		window.eval(introBootstrap);
		expect(document.documentElement.dataset.intro).toBe("play");
		expect(warning).toHaveBeenCalledOnce();
	});
});
