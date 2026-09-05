import {
	ACESFilmicToneMapping,
	Box3,
	type BufferGeometry,
	CanvasTexture,
	DirectionalLight,
	Group,
	HemisphereLight,
	type Material,
	Mesh,
	MeshPhysicalMaterial,
	PerspectiveCamera,
	PMREMGenerator,
	Scene,
	SphereGeometry,
	Sprite,
	SpriteMaterial,
	SRGBColorSpace,
	type Texture,
	TorusGeometry,
	TorusKnotGeometry,
	Vector3,
	WebGLRenderer,
	type WebGLRenderTarget,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export type SculptureShape = "knot" | "orbit" | "bloom";

export interface SculptureController {
	setShape(shape: SculptureShape): void;
	setPaused(paused: boolean): void;
	setDark(dark: boolean): void;
	setReducedMotion(reduced: boolean): void;
	rotate(direction: number): void;
	reset(): void;
	dispose(): void;
}

interface SculptureOptions {
	shape: SculptureShape;
	paused: boolean;
	dark: boolean;
	reducedMotion: boolean;
	onReady: () => void;
	onError: (message: string) => void;
}

const SCULPTURE_RADIUS = 1.65;
const VIEW_DIRECTION = new Vector3(0, 0.075, 1).normalize();

export function createSculpture(
	canvas: HTMLCanvasElement,
	options: SculptureOptions,
): SculptureController {
	const renderer = new WebGLRenderer({
		canvas,
		alpha: true,
		antialias: true,
		powerPreference: "low-power",
	});
	const scene = new Scene();
	const camera = new PerspectiveCamera(32, 1, 0.1, 100);
	const sculpture = new Group();
	sculpture.name = "sculpture";
	scene.add(sculpture);

	const geometries = new Set<BufferGeometry>();
	const materials = new Set<Material>();
	const textures = new Set<Texture>();
	const shapes = new Map<SculptureShape, Group>();
	const parent = canvas.parentElement ?? canvas;
	const previousTouchAction = canvas.style.touchAction;
	let controls: OrbitControls | undefined;
	let environment: WebGLRenderTarget | undefined;
	let resizeObserver: ResizeObserver | undefined;
	let intersectionObserver: IntersectionObserver | undefined;
	let shadow: Sprite | undefined;
	let chrome: MeshPhysicalMaterial;
	let orange: MeshPhysicalMaterial;
	let satin: MeshPhysicalMaterial;
	let shape = options.shape;
	let paused = options.paused;
	let reducedMotion = options.reducedMotion;
	let dark = options.dark;
	let disposed = false;
	let failed = false;
	let ready = false;
	let intersecting = true;
	let visible = document.visibilityState !== "hidden";
	let hasSize = false;
	let dragging = false;
	let dirty = true;
	let frame: number | null = null;
	let lastTime: number | null = null;
	let elapsed = 0;
	let distance = 8;
	let width = 0;
	let height = 0;
	let pixelRatio = 0;

	function geometry<T extends BufferGeometry>(value: T): T {
		geometries.add(value);
		return value;
	}

	function material<T extends Material>(value: T): T {
		materials.add(value);
		return value;
	}

	function buildShape(nextShape: SculptureShape): Group {
		const cached = shapes.get(nextShape);
		if (cached) return cached;
		const form = new Group();
		form.name = nextShape;
		// Register before construction so initialization failures also release resources.
		shapes.set(nextShape, form);

		if (nextShape === "knot") {
			const knot = new Mesh(
				geometry(new TorusKnotGeometry(1, 0.335, 240, 40, 2, 3)),
				chrome,
			);
			knot.rotation.set(0.34, -0.12, -0.57);
			form.add(knot);

			const satellite = new Mesh(
				geometry(new SphereGeometry(0.265, 48, 32)),
				orange,
			);
			satellite.position.set(1.42, -0.92, 0.8);
			form.add(satellite);
		} else if (nextShape === "orbit") {
			const ringGeometry = geometry(new TorusGeometry(1.28, 0.115, 28, 160));
			const firstRing = new Mesh(ringGeometry, chrome);
			firstRing.rotation.set(0.68, 0.42, 0.25);
			const secondRing = new Mesh(ringGeometry, satin);
			secondRing.rotation.set(-0.88, -0.58, -0.36);
			const accentRing = new Mesh(
				geometry(new TorusGeometry(1.29, 0.065, 24, 160)),
				orange,
			);
			accentRing.rotation.set(1.38, -0.45, 0.55);
			form.add(firstRing, secondRing, accentRing);

			const core = new Mesh(geometry(new SphereGeometry(0.57, 64, 40)), chrome);
			const satellite = new Mesh(
				geometry(new SphereGeometry(0.23, 40, 28)),
				orange,
			);
			satellite.position.set(1.05, 0.64, 0.36);
			form.add(core, satellite);
		} else {
			const petalGeometry = geometry(new SphereGeometry(1, 48, 32));
			for (let index = 0; index < 7; index++) {
				const angle = (index / 7) * Math.PI * 2;
				const petal = new Mesh(petalGeometry, index % 3 === 0 ? satin : chrome);
				petal.scale.set(0.365, 0.79, 0.32);
				petal.position.set(
					Math.sin(angle) * 0.9,
					Math.cos(angle) * 0.9,
					Math.sin(angle * 2) * 0.12,
				);
				petal.rotation.set(0.14, Math.cos(angle) * 0.26, -angle);
				form.add(petal);
			}
			const center = new Mesh(
				geometry(new SphereGeometry(0.365, 48, 32)),
				orange,
			);
			center.position.z = 0.38;
			const collar = new Mesh(
				geometry(new TorusGeometry(0.375, 0.045, 20, 80)),
				chrome,
			);
			collar.position.z = 0.34;
			form.add(center, collar);
			form.rotation.set(0.12, -0.15, 0.13);
		}

		// Fit the actual vertices, not a loose bounding-box sphere, for equally bold modes.
		form.updateMatrixWorld(true);
		const center = new Box3().setFromObject(form).getCenter(new Vector3());
		const vertex = new Vector3();
		let radius = 0;
		form.traverse((object) => {
			if (!(object instanceof Mesh)) return;
			const positions = object.geometry.getAttribute("position");
			for (let index = 0; index < positions.count; index++) {
				vertex
					.fromBufferAttribute(positions, index)
					.applyMatrix4(object.matrixWorld);
				radius = Math.max(radius, vertex.distanceTo(center));
			}
		});
		const scale = SCULPTURE_RADIUS / Math.max(radius, 0.001);
		form.scale.setScalar(scale);
		form.position.copy(center).multiplyScalar(-scale);
		return form;
	}

	function canRender(): boolean {
		return !disposed && !failed && hasSize && intersecting && visible;
	}

	function automaticMotion(): boolean {
		return !paused && !reducedMotion && !dragging;
	}

	function stop(): void {
		if (frame !== null) cancelAnimationFrame(frame);
		frame = null;
		lastTime = null;
	}

	function invalidate(): void {
		dirty = true;
		if (canRender() && frame === null) frame = requestAnimationFrame(draw);
	}

	function fail(message: string): void {
		if (disposed || failed) return;
		failed = true;
		stop();
		if (controls) controls.enabled = false;
		canvas.dataset.sceneReady = "false";
		options.onError(message);
	}

	function draw(time: number): void {
		frame = null;
		if (!canRender()) return;
		const delta =
			lastTime === null
				? 0
				: Math.min(Math.max((time - lastTime) / 1000, 0), 0.05);
		lastTime = time;
		if (automaticMotion()) {
			elapsed += delta;
			sculpture.rotation.y += delta * 0.14;
			sculpture.position.y = Math.sin(elapsed * 0.7) * 0.045;
			dirty = true;
		}
		if (dirty) {
			try {
				renderer.render(scene, camera);
			} catch {
				fail(
					"The 3D view stopped unexpectedly. Retry to bring the sculpture back.",
				);
				return;
			}
			dirty = false;
			if (!ready) {
				ready = true;
				canvas.dataset.sceneReady = "true";
				options.onReady();
			}
		}
		if (canRender() && automaticMotion() && frame === null) {
			frame = requestAnimationFrame(draw);
		} else if (frame === null) {
			lastTime = null;
		}
	}

	function syncMotion(): void {
		stop();
		invalidate();
	}

	function resize(): void {
		if (disposed || failed) return;
		const nextWidth = parent.clientWidth;
		const nextHeight = parent.clientHeight;
		hasSize = nextWidth > 0 && nextHeight > 0;
		if (!hasSize) {
			stop();
			return;
		}
		const mobile =
			nextWidth < 600 || window.matchMedia("(pointer: coarse)").matches;
		const nextRatio = Math.min(
			window.devicePixelRatio || 1,
			mobile ? 1.25 : 1.5,
		);
		if (
			width === nextWidth &&
			height === nextHeight &&
			pixelRatio === nextRatio
		) {
			invalidate();
			return;
		}
		width = nextWidth;
		height = nextHeight;
		pixelRatio = nextRatio;
		renderer.setPixelRatio(pixelRatio);
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		const verticalHalfAngle = (camera.fov * Math.PI) / 360;
		const limitingHalfAngle = Math.atan(
			Math.tan(verticalHalfAngle) * Math.min(camera.aspect, 1),
		);
		distance = (SCULPTURE_RADIUS + 0.06) / Math.sin(limitingHalfAngle * 0.8);
		camera.position.normalize().multiplyScalar(distance);
		camera.updateProjectionMatrix();
		controls?.update();
		invalidate();
	}

	function onVisibilityChange(): void {
		visible = document.visibilityState !== "hidden";
		dragging = false;
		syncMotion();
	}

	function onControlStart(): void {
		dragging = true;
		syncMotion();
	}

	function onControlEnd(): void {
		dragging = false;
		syncMotion();
	}

	function onContextLost(event: Event): void {
		event.preventDefault();
		fail(
			"The graphics connection was interrupted. Retry the 3D view to reconnect.",
		);
	}

	function onContextRestored(): void {
		if (disposed || !failed) return;
		options.onError(
			"The graphics connection is back. Retry the 3D view, or reload this page.",
		);
	}

	function applyTheme(): void {
		renderer.toneMappingExposure = dark ? 1.16 : 1.02;
		scene.environmentIntensity = dark ? 1.35 : 1.1;
		if (shadow) shadow.material.opacity = dark ? 0.12 : 0.23;
		invalidate();
	}

	function reset(): void {
		if (disposed || failed) return;
		elapsed = 0;
		sculpture.position.set(0, 0, 0);
		sculpture.rotation.set(0, -0.18, -0.055);
		camera.position.copy(VIEW_DIRECTION).multiplyScalar(distance);
		controls?.target.set(0, 0, 0);
		controls?.update();
		syncMotion();
	}

	function dispose(): void {
		if (disposed) return;
		disposed = true;
		stop();
		resizeObserver?.disconnect();
		intersectionObserver?.disconnect();
		window.removeEventListener("resize", resize);
		document.removeEventListener("visibilitychange", onVisibilityChange);
		canvas.removeEventListener("webglcontextlost", onContextLost);
		canvas.removeEventListener("webglcontextrestored", onContextRestored);
		controls?.removeEventListener("change", invalidate);
		controls?.removeEventListener("start", onControlStart);
		controls?.removeEventListener("end", onControlEnd);
		controls?.dispose();
		canvas.style.touchAction = previousTouchAction;
		for (const value of geometries) value.dispose();
		for (const value of materials) value.dispose();
		for (const value of textures) value.dispose();
		geometries.clear();
		materials.clear();
		textures.clear();
		shapes.clear();
		scene.environment = null;
		environment?.dispose();
		scene.clear();
		renderer.dispose();
		renderer.forceContextLoss();
		delete canvas.dataset.sceneReady;
		delete canvas.dataset.shape;
	}

	try {
		renderer.setClearColor(0x000000, 0);
		renderer.outputColorSpace = SRGBColorSpace;
		renderer.toneMapping = ACESFilmicToneMapping;
		canvas.dataset.sceneReady = "false";
		canvas.dataset.shape = shape;
		camera.position.copy(VIEW_DIRECTION).multiplyScalar(distance);

		const room = new RoomEnvironment();
		try {
			const generator = new PMREMGenerator(renderer);
			try {
				environment = generator.fromScene(room, 0.025, 0.1, 100, {
					size: 256,
				});
			} finally {
				generator.dispose();
			}
		} finally {
			room.dispose();
		}
		scene.environment = environment.texture;
		scene.environmentRotation.set(0.08, 0.58, -0.06);

		chrome = material(
			new MeshPhysicalMaterial({
				color: 0xe6e6e2,
				metalness: 1,
				roughness: 0.155,
				clearcoat: 1,
				clearcoatRoughness: 0.12,
				envMapIntensity: 1.15,
			}),
		);
		satin = material(
			new MeshPhysicalMaterial({
				color: 0xd1d2ce,
				metalness: 1,
				roughness: 0.235,
				clearcoat: 0.8,
				clearcoatRoughness: 0.14,
			}),
		);
		orange = material(
			new MeshPhysicalMaterial({
				color: "#e35e3a",
				metalness: 0.15,
				roughness: 0.24,
				clearcoat: 1,
				clearcoatRoughness: 0.15,
				envMapIntensity: 0.65,
			}),
		);
		const key = new DirectionalLight(0xfffaf3, 3.4);
		key.position.set(-3, 5, 4);
		const edge = new DirectionalLight(0xffffff, 2.2);
		edge.position.set(4, 1, -3);
		scene.add(key, edge, new HemisphereLight(0xfffaf3, 0x777570, 0.5));
		sculpture.add(buildShape(shape));

		const shadowCanvas = document.createElement("canvas");
		shadowCanvas.width = 128;
		shadowCanvas.height = 128;
		const context = shadowCanvas.getContext("2d");
		if (context) {
			const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
			gradient.addColorStop(0, "rgba(28, 26, 22, 0.5)");
			gradient.addColorStop(0.45, "rgba(28, 26, 22, 0.23)");
			gradient.addColorStop(1, "rgba(28, 26, 22, 0)");
			context.fillStyle = gradient;
			context.fillRect(0, 0, 128, 128);
			const texture = new CanvasTexture(shadowCanvas);
			texture.colorSpace = SRGBColorSpace;
			textures.add(texture);
			shadow = new Sprite(
				material(
					new SpriteMaterial({
						map: texture,
						transparent: true,
						depthWrite: false,
						toneMapped: false,
					}),
				),
			);
			shadow.name = "ground-shadow";
			shadow.position.set(0, -1.76, -0.5);
			shadow.scale.set(3.1, 0.43, 1);
			scene.add(shadow);
		}

		controls = new OrbitControls(camera, canvas);
		controls.enableZoom = false;
		controls.enablePan = false;
		controls.enableDamping = false;
		controls.rotateSpeed = 0.65;
		controls.minPolarAngle = Math.PI * 0.22;
		controls.maxPolarAngle = Math.PI * 0.73;
		// OrbitControls sets "none" on connect; keep vertical page scrolling available.
		canvas.style.touchAction = "pan-y";
		controls.addEventListener("change", invalidate);
		controls.addEventListener("start", onControlStart);
		controls.addEventListener("end", onControlEnd);
		canvas.addEventListener("webglcontextlost", onContextLost);
		canvas.addEventListener("webglcontextrestored", onContextRestored);
		document.addEventListener("visibilitychange", onVisibilityChange);
		window.addEventListener("resize", resize, { passive: true });
		if (typeof ResizeObserver !== "undefined") {
			resizeObserver = new ResizeObserver(resize);
			resizeObserver.observe(parent);
		}
		if (typeof IntersectionObserver !== "undefined") {
			intersectionObserver = new IntersectionObserver(
				(entries) => {
					if (disposed) return;
					const entry = entries.find((value) => value.target === canvas);
					if (!entry) return;
					intersecting = entry.isIntersecting;
					dragging = false;
					syncMotion();
				},
				{ threshold: 0 },
			);
			intersectionObserver.observe(canvas);
		}
		applyTheme();
		resize();
		reset();
	} catch (error) {
		dispose();
		throw error;
	}

	return {
		setShape(nextShape) {
			if (disposed || failed || nextShape === shape) return;
			const next = buildShape(nextShape);
			sculpture.clear();
			sculpture.add(next);
			shape = nextShape;
			canvas.dataset.shape = nextShape;
			reset();
		},
		setPaused(nextPaused) {
			if (disposed || failed || nextPaused === paused) return;
			paused = nextPaused;
			syncMotion();
		},
		setDark(nextDark) {
			if (disposed || failed || nextDark === dark) return;
			dark = nextDark;
			applyTheme();
		},
		setReducedMotion(reduced) {
			if (disposed || failed || reduced === reducedMotion) return;
			reducedMotion = reduced;
			syncMotion();
		},
		rotate(direction) {
			if (disposed || failed || !Number.isFinite(direction)) return;
			sculpture.rotation.y += Math.sign(direction) * (Math.PI / 8);
			invalidate();
		},
		reset,
		dispose,
	};
}
