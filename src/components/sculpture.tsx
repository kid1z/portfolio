"use client";

import {
	ChevronLeft,
	ChevronRight,
	Pause,
	Play,
	RotateCcw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
	SculptureController,
	SculptureShape,
} from "#/lib/sculpture-scene";

const shapes: SculptureShape[] = ["knot", "orbit", "bloom"];
const iconButton =
	"inline-flex items-center justify-center rounded-[50%] bg-transparent text-muted transition-[background,scale] duration-[160ms] ease-[ease] enabled:hover:bg-surface enabled:active:scale-[0.94]";

export default function Sculpture({
	dark,
	reducedMotion,
}: {
	dark: boolean;
	reducedMotion: boolean;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const controller = useRef<SculptureController | null>(null);
	const [shape, setShape] = useState<SculptureShape>("knot");
	const [paused, setPaused] = useState(false);
	const [status, setStatus] = useState<"loading" | "ready" | "error">(
		"loading",
	);
	const [error, setError] = useState("");
	const [attempt, setAttempt] = useState(0);
	const settings = useRef({ shape, paused, dark, reducedMotion });
	settings.current = { shape, paused, dark, reducedMotion };

	// biome-ignore lint/correctness/useExhaustiveDependencies: Retry deliberately creates a fresh WebGL scene.
	useEffect(() => {
		let cancelled = false;
		const canvas = canvasRef.current;
		if (!canvas) return;
		setStatus("loading");
		import("#/lib/sculpture-scene")
			.then(({ createSculpture }) => {
				if (cancelled) return;
				controller.current = createSculpture(canvas, {
					...settings.current,
					onReady: () => setStatus("ready"),
					onError: (message) => {
						setError(message);
						setStatus("error");
					},
				});
			})
			.catch((cause: unknown) => {
				if (cancelled) return;
				console.error("The 3D sculpture could not start.", cause);
				setError(
					"The interactive view is unavailable. You can still explore all my work.",
				);
				setStatus("error");
			});
		return () => {
			cancelled = true;
			controller.current?.dispose();
			controller.current = null;
		};
	}, [attempt]);

	useEffect(() => controller.current?.setShape(shape), [shape]);
	useEffect(() => controller.current?.setPaused(paused), [paused]);
	useEffect(() => controller.current?.setDark(dark), [dark]);
	useEffect(
		() => controller.current?.setReducedMotion(reducedMotion),
		[reducedMotion],
	);

	const unavailable = status !== "ready";

	return (
		<div
			className="sculpture w-full min-w-0 pt-0 max-md:mx-auto max-md:mt-[5px] max-md:max-w-[490px]"
			id="playground"
		>
			<div className="relative h-[clamp(350px,38vw,540px)] w-full max-md:h-[clamp(280px,76vw,390px)]">
				{status !== "ready" && (
					<img
						className="absolute inset-0 size-full object-contain"
						src={
							dark
								? "/images/sculpture-dark.png"
								: "/images/sculpture-light.png"
						}
						alt="A polished silver knot with a vermilion accent, an original 3D sculpture"
						width={800}
						height={800}
					/>
				)}
				<canvas
					key={attempt}
					ref={canvasRef}
					className={`size-full cursor-grab touch-pan-y transition-opacity duration-500 ease-[ease] active:cursor-grabbing ${status === "ready" ? "opacity-100" : "opacity-0"}`}
					aria-label={`Interactive ${shape} sculpture. Use the controls below to change its form or rotate it.`}
					role="img"
				/>
				<div className="absolute top-3 right-0 flex gap-1 max-md:top-4">
					<button
						type="button"
						className={`${iconButton} size-[34px]`}
						disabled={unavailable || reducedMotion}
						aria-label={
							paused || reducedMotion
								? "Resume sculpture animation"
								: "Pause sculpture animation"
						}
						aria-pressed={paused || reducedMotion}
						onClick={() => setPaused((value) => !value)}
					>
						{paused || reducedMotion ? <Play size={15} /> : <Pause size={15} />}
					</button>
					<button
						type="button"
						className={`${iconButton} size-[34px]`}
						disabled={unavailable}
						aria-label="Reset sculpture view"
						onClick={() => controller.current?.reset()}
					>
						<RotateCcw size={15} />
					</button>
				</div>
			</div>
			<div className="-mt-[6px] flex items-center justify-between gap-2.5 px-[30px] max-[68.8125rem]:px-0 max-md:-mt-[5px]">
				<fieldset className="m-0 flex min-w-0 gap-[3px] rounded-full border border-line p-1">
					<legend className="sr-only">Sculpture shape</legend>
					{shapes.map((value) => (
						<button
							type="button"
							key={value}
							className="rounded-full bg-transparent px-[17px] py-2 text-[11px] text-muted capitalize transition-[color,background] duration-[180ms] ease-[ease] aria-pressed:bg-ink aria-pressed:text-paper enabled:not-aria-pressed:hover:bg-surface enabled:not-aria-pressed:hover:text-ink max-md:px-[15px]"
							aria-pressed={shape === value}
							disabled={unavailable}
							onClick={() => setShape(value)}
						>
							{value}
						</button>
					))}
				</fieldset>
				<div className="flex items-center gap-px text-muted">
					<button
						type="button"
						className={`${iconButton} h-8 w-[26px]`}
						disabled={unavailable}
						aria-label="Rotate sculpture left"
						onClick={() => controller.current?.rotate(-1)}
					>
						<ChevronLeft size={15} />
					</button>
					<span className="text-[10px] whitespace-nowrap max-[68.8125rem]:hidden max-md:inline max-[22.5rem]:hidden">
						Drag to rotate
					</span>
					<button
						type="button"
						className={`${iconButton} h-8 w-[26px]`}
						disabled={unavailable}
						aria-label="Rotate sculpture right"
						onClick={() => controller.current?.rotate(1)}
					>
						<ChevronRight size={15} />
					</button>
				</div>
			</div>
			<div
				className="min-h-[42px] px-5 pt-4 text-center text-[10px] leading-[1.6] text-muted max-md:min-h-8 max-md:pt-3 max-md:text-[9px]"
				aria-live="polite"
			>
				{status === "loading" && (
					<span>Preparing a little something in 3D...</span>
				)}
				{status === "error" && (
					<span>
						{error}{" "}
						<button
							type="button"
							className="bg-transparent p-0 underline underline-offset-[3px]"
							onClick={() => setAttempt((value) => value + 1)}
						>
							Retry 3D
						</button>
					</span>
				)}
				{status === "ready" && (
					<span>
						{reducedMotion
							? "A still moment. Reduced motion is on."
							: "A small experiment, made with Three.js."}
					</span>
				)}
			</div>
		</div>
	);
}
