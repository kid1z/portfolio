import {
	type BufferGeometry,
	type Group,
	type Material,
	Mesh,
	MeshPhysicalMaterial,
	type PerspectiveCamera,
	type Scene,
	Sprite,
	Vector3,
	type WebGLRenderTarget,
} from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createSculpture,
	type SculptureController,
	type SculptureShape,
} from "./sculpture-scene";

interface RendererDouble {
	render: ReturnType<
		typeof vi.fn<(scene: Scene, camera: PerspectiveCamera) => void>
	>;
	setSize: ReturnType<typeof vi.fn>;
	setPixelRatio: ReturnType<typeof vi.fn>;
	setClearColor: ReturnType<typeof vi.fn>;
	dispose: ReturnType<typeof vi.fn>;
	forceContextLoss: ReturnType<typeof vi.fn>;
	toneMappingExposure: number;
}

const mocks = vi.hoisted(() => ({
	renderers: [] as RendererDouble[],
	controls: [] as OrbitControls[],
	targets: [] as WebGLRenderTarget[],
	generatorDisposals: [] as Array<ReturnType<typeof vi.fn>>,
	failEnvironment: false,
}));

vi.mock("three", async (importOriginal) => {
	const actual = await importOriginal<typeof import("three")>();
	return {
		...actual,
		WebGLRenderer: class {
			render = vi.fn<(scene: Scene, camera: PerspectiveCamera) => void>();
			setSize = vi.fn();
			setPixelRatio = vi.fn();
			setClearColor = vi.fn();
			dispose = vi.fn();
			forceContextLoss = vi.fn();
			toneMappingExposure = 1;
			constructor() {
				mocks.renderers.push(this);
			}
		},
		PMREMGenerator: class {
			dispose = vi.fn();
			constructor() {
				mocks.generatorDisposals.push(this.dispose);
			}
			fromScene() {
				if (mocks.failEnvironment) throw new Error("Environment failed");
				const target = new actual.WebGLRenderTarget(256, 256);
				vi.spyOn(target, "dispose");
				mocks.targets.push(target);
				return target;
			}
		},
	};
});

vi.mock("three/addons/controls/OrbitControls.js", async (importOriginal) => {
	const actual =
		await importOriginal<
			typeof import("three/addons/controls/OrbitControls.js")
		>();
	return {
		OrbitControls: class extends actual.OrbitControls {
			constructor(camera: PerspectiveCamera, canvas: HTMLCanvasElement) {
				super(camera, canvas);
				mocks.controls.push(this);
			}
		},
	};
});

let callbacks: Map<number, FrameRequestCallback>;
let controllers: SculptureController[];
let intersections: Array<{
	callback: IntersectionObserverCallback;
	observe: ReturnType<typeof vi.fn>;
	disconnect: ReturnType<typeof vi.fn>;
}>;
let resizes: Array<{
	callback: ResizeObserverCallback;
	observe: ReturnType<typeof vi.fn>;
	disconnect: ReturnType<typeof vi.fn>;
}>;

beforeEach(() => {
	mocks.renderers.length = 0;
	mocks.controls.length = 0;
	mocks.targets.length = 0;
	mocks.generatorDisposals.length = 0;
	mocks.failEnvironment = false;
	callbacks = new Map();
	controllers = [];
	intersections = [];
	resizes = [];
	let nextFrame = 0;
	vi.stubGlobal(
		"requestAnimationFrame",
		vi.fn((callback: FrameRequestCallback) => {
			callbacks.set(++nextFrame, callback);
			return nextFrame;
		}),
	);
	vi.stubGlobal(
		"cancelAnimationFrame",
		vi.fn((id: number) => callbacks.delete(id)),
	);
	vi.stubGlobal(
		"IntersectionObserver",
		class {
			observe = vi.fn();
			disconnect = vi.fn();
			constructor(public callback: IntersectionObserverCallback) {
				intersections.push(this);
			}
		},
	);
	vi.stubGlobal(
		"ResizeObserver",
		class {
			observe = vi.fn();
			disconnect = vi.fn();
			constructor(public callback: ResizeObserverCallback) {
				resizes.push(this);
			}
		},
	);
	vi.stubGlobal(
		"matchMedia",
		vi.fn(() => ({ matches: false })),
	);
	vi.stubGlobal("devicePixelRatio", 3);
	vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
		createRadialGradient: () => ({ addColorStop: vi.fn() }),
		fillRect: vi.fn(),
	} as unknown as CanvasRenderingContext2D);
});

afterEach(() => {
	for (const controller of controllers) controller.dispose();
	document.body.replaceChildren();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

function flush(time = 0) {
	const pending = [...callbacks.values()];
	callbacks.clear();
	for (const callback of pending) callback(time);
}

function setup(
	settings: Partial<Parameters<typeof createSculpture>[1]> = {},
	size = { width: 800, height: 800 },
) {
	const parent = document.createElement("div");
	const canvas = document.createElement("canvas");
	canvas.style.touchAction = "auto";
	parent.append(canvas);
	document.body.append(parent);
	Object.defineProperty(parent, "clientWidth", { get: () => size.width });
	Object.defineProperty(parent, "clientHeight", { get: () => size.height });
	const options = {
		shape: "knot" as SculptureShape,
		paused: false,
		dark: false,
		reducedMotion: false,
		onReady: vi.fn(),
		onError: vi.fn(),
		...settings,
	};
	const controller = createSculpture(canvas, options);
	controllers.push(controller);
	return { canvas, parent, options, controller, size };
}

function rendered() {
	const renderer = mocks.renderers[0];
	const lastCall = renderer.render.mock.lastCall;
	if (!lastCall) throw new Error("Expected the scene to have rendered");
	const [scene, camera] = lastCall;
	const sculpture = scene.getObjectByName("sculpture") as Group;
	return { renderer, scene, camera, sculpture };
}

function intersect(canvas: HTMLCanvasElement, isIntersecting: boolean) {
	const observer = intersections[0];
	observer.callback(
		[
			{
				target: canvas,
				isIntersecting,
				intersectionRatio: isIntersecting ? 1 : 0,
				boundingClientRect: canvas.getBoundingClientRect(),
				intersectionRect: canvas.getBoundingClientRect(),
				rootBounds: null,
				time: 0,
			},
		],
		observer as unknown as IntersectionObserver,
	);
}

describe("sculpture scene", () => {
	it("initializes a transparent, lit chrome sculpture with a vermilion satellite", () => {
		const { canvas, options } = setup();
		expect(canvas.dataset.sceneReady).toBe("false");
		expect(options.onReady).not.toHaveBeenCalled();
		flush();
		const { renderer, scene, sculpture } = rendered();
		expect(canvas.dataset.sceneReady).toBe("true");
		expect(canvas.dataset.shape).toBe("knot");
		expect(options.onReady).toHaveBeenCalledOnce();
		expect(renderer.setClearColor).toHaveBeenCalledWith(0, 0);
		expect(renderer.setPixelRatio).toHaveBeenCalledWith(1.5);
		expect(scene.background).toBeNull();
		expect(scene.environment).toBe(mocks.targets[0].texture);
		expect(mocks.generatorDisposals[0]).toHaveBeenCalledOnce();
		const meshes = sculpture.children[0].children as Mesh[];
		expect(meshes).toHaveLength(2);
		expect(meshes[0].geometry.type).toBe("TorusKnotGeometry");
		expect(meshes[0].material).toBeInstanceOf(MeshPhysicalMaterial);
		expect((meshes[0].material as MeshPhysicalMaterial).metalness).toBe(1);
		expect(
			(meshes[1].material as MeshPhysicalMaterial).color.getHexString(),
		).toBe("e35e3a");
		expect(scene.getObjectByName("ground-shadow")).toBeInstanceOf(Sprite);
		expect(mocks.controls[0].enableZoom).toBe(false);
		expect(mocks.controls[0].enablePan).toBe(false);
		expect(mocks.controls[0].enableDamping).toBe(false);
		expect(canvas.style.touchAction).toBe("pan-y");
		flush(16);
		expect(options.onReady).toHaveBeenCalledOnce();
	});

	it("builds three distinct, uniformly bounded forms and reuses cached geometry", () => {
		const { controller, canvas } = setup({ paused: true });
		flush();
		const { sculpture } = rendered();
		const original = sculpture.children[0];
		const vertex = new Vector3();
		for (const [shape, count] of [
			["orbit", 5],
			["bloom", 9],
			["knot", 2],
		] as const) {
			controller.setShape(shape);
			flush();
			expect(canvas.dataset.shape).toBe(shape);
			expect(sculpture.children).toHaveLength(1);
			expect(sculpture.children[0].children).toHaveLength(count);
			sculpture.updateMatrixWorld(true);
			let radius = 0;
			sculpture.traverse((object) => {
				if (!(object instanceof Mesh)) return;
				const positions = object.geometry.getAttribute("position");
				for (let index = 0; index < positions.count; index++) {
					vertex
						.fromBufferAttribute(positions, index)
						.applyMatrix4(object.matrixWorld);
					radius = Math.max(radius, vertex.length());
				}
			});
			expect(radius).toBeCloseTo(1.65, 5);
			expect(callbacks.size).toBe(0);
		}
		expect(sculpture.children[0]).toBe(original);
	});

	it("stops idle frames when paused or reduced, but allows explicit rotation and dragging", () => {
		const { controller } = setup();
		flush(0);
		const { sculpture, renderer } = rendered();
		const initialAngle = sculpture.rotation.y;
		flush(20);
		expect(sculpture.rotation.y).toBeGreaterThan(initialAngle);
		controller.setPaused(true);
		flush(40);
		expect(callbacks.size).toBe(0);
		const frozen = sculpture.rotation.y;
		controller.rotate(-1);
		flush(60);
		expect(sculpture.rotation.y).toBeCloseTo(frozen - Math.PI / 8);
		expect(callbacks.size).toBe(0);
		const count = renderer.render.mock.calls.length;
		mocks.controls[0].dispatchEvent({ type: "change" });
		flush(80);
		expect(renderer.render).toHaveBeenCalledTimes(count + 1);
		controller.setPaused(false);
		flush(100);
		expect(callbacks.size).toBe(1);
		mocks.controls[0].dispatchEvent({ type: "start" });
		flush(120);
		expect(callbacks.size).toBe(0);
		mocks.controls[0].dispatchEvent({ type: "end" });
		flush(140);
		expect(callbacks.size).toBe(1);
		controller.setReducedMotion(true);
		flush(160);
		expect(callbacks.size).toBe(0);
		controller.reset();
		flush(180);
		expect(sculpture.rotation.y).toBe(-0.18);
		expect(sculpture.position.y).toBe(0);
		expect(callbacks.size).toBe(0);
		controller.setReducedMotion(false);
		flush(200);
		expect(callbacks.size).toBe(1);
	});

	it("suspends offscreen and hidden rendering and clamps time after resuming", () => {
		const { canvas, controller } = setup();
		flush(0);
		flush(20);
		const { sculpture, renderer } = rendered();
		intersect(canvas, false);
		expect(callbacks.size).toBe(0);
		const renders = renderer.render.mock.calls.length;
		controller.rotate(1);
		expect(callbacks.size).toBe(0);
		expect(renderer.render).toHaveBeenCalledTimes(renders);
		intersect(canvas, true);
		const angle = sculpture.rotation.y;
		flush(100_000);
		expect(sculpture.rotation.y).toBe(angle);
		flush(200_000);
		expect(sculpture.rotation.y - angle).toBeCloseTo(0.05 * 0.14);
		vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
		document.dispatchEvent(new Event("visibilitychange"));
		expect(callbacks.size).toBe(0);
		vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
		document.dispatchEvent(new Event("visibilitychange"));
		flush(300_000);
		expect(callbacks.size).toBe(1);
	});

	it("resizes for narrow canvases, caps mobile resolution and updates the theme", () => {
		const { controller, size } = setup({ paused: true });
		flush();
		const { camera, renderer, scene } = rendered();
		const initialDistance = camera.position.length();
		size.width = 360;
		size.height = 560;
		window.dispatchEvent(new Event("resize"));
		flush();
		expect(camera.aspect).toBe(360 / 560);
		expect(camera.position.length()).toBeGreaterThan(initialDistance);
		expect(renderer.setPixelRatio).toHaveBeenLastCalledWith(1.25);
		expect(renderer.setSize).toHaveBeenLastCalledWith(360, 560, false);
		const initialExposure = renderer.toneMappingExposure;
		controller.setDark(true);
		flush();
		expect(renderer.toneMappingExposure).toBeGreaterThan(initialExposure);
		expect(scene.environmentIntensity).toBe(1.35);
		expect(callbacks.size).toBe(0);
	});

	it("waits for a nonzero parent size before declaring the renderer ready", () => {
		const { size, options } = setup(
			{ reducedMotion: true },
			{ width: 0, height: 0 },
		);
		expect(callbacks.size).toBe(0);
		expect(options.onReady).not.toHaveBeenCalled();
		size.width = 420;
		size.height = 420;
		const observer = resizes[0];
		observer.callback([], observer as unknown as ResizeObserver);
		flush();
		expect(options.onReady).toHaveBeenCalledOnce();
		expect(callbacks.size).toBe(0);
	});

	it("reports context loss, stays stopped after restoration and allows safe disposal", () => {
		const { canvas, controller, options } = setup();
		flush();
		const event = new Event("webglcontextlost", { cancelable: true });
		canvas.dispatchEvent(event);
		expect(event.defaultPrevented).toBe(true);
		expect(options.onError).toHaveBeenCalledOnce();
		expect(options.onError).toHaveBeenLastCalledWith(
			expect.stringContaining("interrupted"),
		);
		expect(canvas.dataset.sceneReady).toBe("false");
		expect(mocks.controls[0].enabled).toBe(false);
		controller.setPaused(false);
		controller.rotate(1);
		controller.setShape("bloom");
		expect(canvas.dataset.shape).toBe("knot");
		expect(callbacks.size).toBe(0);
		canvas.dispatchEvent(new Event("webglcontextrestored"));
		expect(options.onError).toHaveBeenLastCalledWith(
			expect.stringContaining("reload"),
		);
		expect(callbacks.size).toBe(0);
		controller.dispose();
		canvas.dispatchEvent(new Event("webglcontextlost"));
		expect(options.onError).toHaveBeenCalledTimes(2);
	});

	it("releases cached geometries, materials, textures, controls, observers and WebGL exactly once", () => {
		const { canvas, controller } = setup({ paused: true });
		flush();
		const { renderer, sculpture, scene } = rendered();
		const resources = new Set<BufferGeometry | Material>();
		for (const shape of ["knot", "orbit", "bloom"] as const) {
			controller.setShape(shape);
			sculpture.traverse((object) => {
				if (!(object instanceof Mesh)) return;
				resources.add(object.geometry);
				if (!Array.isArray(object.material)) resources.add(object.material);
			});
		}
		const disposals = [...resources].map((value) => vi.spyOn(value, "dispose"));
		const shadow = scene.getObjectByName("ground-shadow") as Sprite;
		const shadowDispose = vi.spyOn(shadow.material, "dispose");
		const texture = shadow.material.map;
		if (!texture) throw new Error("Expected a procedural shadow texture");
		const textureDispose = vi.spyOn(texture, "dispose");
		const controlDispose = vi.spyOn(mocks.controls[0], "dispose");
		controller.dispose();
		controller.dispose();
		for (const dispose of disposals) expect(dispose).toHaveBeenCalledOnce();
		expect(shadowDispose).toHaveBeenCalledOnce();
		expect(textureDispose).toHaveBeenCalledOnce();
		expect(controlDispose).toHaveBeenCalledOnce();
		expect(mocks.targets[0].dispose).toHaveBeenCalledOnce();
		expect(renderer.dispose).toHaveBeenCalledOnce();
		expect(renderer.forceContextLoss).toHaveBeenCalledOnce();
		expect(intersections[0].disconnect).toHaveBeenCalledOnce();
		expect(resizes[0].disconnect).toHaveBeenCalledOnce();
		expect(callbacks.size).toBe(0);
		expect(canvas.style.touchAction).toBe("auto");
		expect(canvas.dataset.sceneReady).toBeUndefined();
		expect(canvas.dataset.shape).toBeUndefined();
		window.dispatchEvent(new Event("resize"));
		mocks.controls[0].dispatchEvent({ type: "change" });
		intersect(canvas, true);
		controller.reset();
		controller.setDark(true);
		expect(callbacks.size).toBe(0);
	});

	it("cleans up initialization failures before propagating them to the wrapper", () => {
		const roomDispose = vi.spyOn(RoomEnvironment.prototype, "dispose");
		mocks.failEnvironment = true;
		expect(() => setup()).toThrow("Environment failed");
		expect(roomDispose).toHaveBeenCalledOnce();
		expect(mocks.generatorDisposals[0]).toHaveBeenCalledOnce();
		expect(mocks.renderers[0].dispose).toHaveBeenCalledOnce();
		expect(mocks.renderers[0].forceContextLoss).toHaveBeenCalledOnce();
		expect(callbacks.size).toBe(0);
	});

	it("surfaces render failures rather than silently leaving a broken animation loop", () => {
		const { canvas, options } = setup();
		mocks.renderers[0].render.mockImplementationOnce(() => {
			throw new Error("Render failed");
		});
		flush();
		expect(options.onError).toHaveBeenCalledWith(
			expect.stringContaining("stopped unexpectedly"),
		);
		expect(options.onReady).not.toHaveBeenCalled();
		expect(canvas.dataset.sceneReady).toBe("false");
		expect(callbacks.size).toBe(0);
	});
});
