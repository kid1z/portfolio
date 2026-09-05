import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Sculpture from "./sculpture";

const { controls, initialize } = vi.hoisted(() => {
	const controls = {
		setShape: vi.fn(),
		setPaused: vi.fn(),
		setDark: vi.fn(),
		setReducedMotion: vi.fn(),
		rotate: vi.fn(),
		reset: vi.fn(),
		dispose: vi.fn(),
	};
	return {
		controls,
		initialize: vi.fn(
			(
				_canvas: HTMLCanvasElement,
				options: { onReady: () => void; onError: (message: string) => void },
			) => {
				options.onReady();
				return controls;
			},
		),
	};
});

vi.mock("#/lib/sculpture-scene", () => ({ createSculpture: initialize }));

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("sculpture controls", () => {
	it("replaces a lost canvas before retrying and disposes the old renderer", async () => {
		render(<Sculpture dark={false} reducedMotion={false} />);
		await waitFor(() => expect(initialize).toHaveBeenCalledOnce());
		const originalCanvas = screen.getByRole("img", {
			name: /Interactive knot sculpture/,
		});
		act(() =>
			initialize.mock.calls[0][1].onError("Graphics connection interrupted."),
		);
		fireEvent.click(screen.getByRole("button", { name: "Retry 3D" }));
		await waitFor(() => expect(initialize).toHaveBeenCalledTimes(2));
		expect(
			screen.getByRole("img", { name: /Interactive knot sculpture/ }),
		).not.toBe(originalCanvas);
		expect(controls.dispose).toHaveBeenCalledOnce();
	});
	it("initializes on the client and releases the renderer on unmount", async () => {
		const { unmount } = render(
			<Sculpture dark={false} reducedMotion={false} />,
		);
		await waitFor(() => expect(initialize).toHaveBeenCalledOnce());
		expect(
			screen.getByText("A small experiment, made with Three.js."),
		).toBeTruthy();
		unmount();
		expect(controls.dispose).toHaveBeenCalledOnce();
	});

	it("wires shape, pause, rotation and reset to the engine", async () => {
		render(<Sculpture dark={false} reducedMotion={false} />);
		await waitFor(() => expect(initialize).toHaveBeenCalledOnce());
		fireEvent.click(screen.getByRole("button", { name: "orbit" }));
		expect(controls.setShape).toHaveBeenLastCalledWith("orbit");
		fireEvent.click(
			screen.getByRole("button", { name: "Pause sculpture animation" }),
		);
		expect(controls.setPaused).toHaveBeenLastCalledWith(true);
		fireEvent.click(
			screen.getByRole("button", { name: "Rotate sculpture left" }),
		);
		expect(controls.rotate).toHaveBeenLastCalledWith(-1);
		fireEvent.click(
			screen.getByRole("button", { name: "Reset sculpture view" }),
		);
		expect(controls.reset).toHaveBeenCalledOnce();
	});

	it("updates the theme and honors reduced motion without restarting WebGL", async () => {
		const { rerender } = render(
			<Sculpture dark={false} reducedMotion={false} />,
		);
		await waitFor(() => expect(initialize).toHaveBeenCalledOnce());
		rerender(<Sculpture dark reducedMotion />);
		expect(controls.setDark).toHaveBeenLastCalledWith(true);
		expect(controls.setReducedMotion).toHaveBeenLastCalledWith(true);
		expect(initialize).toHaveBeenCalledOnce();
		expect(
			screen.getByRole<HTMLButtonElement>("button", {
				name: "Resume sculpture animation",
			}).disabled,
		).toBe(true);
	});

	it("shows a useful fallback and allows retry after a WebGL failure", async () => {
		initialize.mockImplementationOnce(() => {
			throw new Error("WebGL unavailable");
		});
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		render(<Sculpture dark={false} reducedMotion={false} />);
		await screen.findByRole("button", { name: "Retry 3D" });
		expect(screen.getByAltText(/polished silver knot/)).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Retry 3D" }));
		await waitFor(() => expect(initialize).toHaveBeenCalledTimes(2));
		expect(
			screen.getByText("A small experiment, made with Three.js."),
		).toBeTruthy();
		error.mockRestore();
	});
});
