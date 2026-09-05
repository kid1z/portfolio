"use client";

import { ArrowUpRight } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useCallback, useRef, useState } from "react";
import { shouldPlayIntro } from "#/lib/intro-preference";
import OldIntro from "./old-intro";

gsap.registerPlugin(useGSAP);

type IntroPhase = "pending" | "playing" | "leaving" | "complete";

export default function IntroGreeting({
	replayKey,
	onActiveChange,
}: {
	replayKey: number;
	onActiveChange?: (active: boolean) => void;
}) {
	const [phase, setPhase] = useState<IntroPhase>("pending");
	const active = phase !== "complete";
	const gateRef = useRef<HTMLDivElement>(null);
	const skipRef = useRef<HTMLButtonElement>(null);
	const complete = useCallback(() => {
		setPhase((current) => (current === "complete" ? current : "leaving"));
	}, []);
	const finish = useCallback(() => setPhase("complete"), []);

	useGSAP(
		() => {
			if (!shouldPlayIntro(replayKey > 0)) {
				finish();
				return;
			}
			setPhase("playing");
		},
		{ dependencies: [replayKey], scope: gateRef },
	);

	useGSAP(
		() => {
			onActiveChange?.(active);
		},
		{ dependencies: [active, onActiveChange], scope: gateRef },
	);

	useGSAP(
		() => {
			if (!active) return;
			const focus = window.setTimeout(() => skipRef.current?.focus(), 50);
			const onEscape = (event: KeyboardEvent) => {
				if (event.key === "Escape") complete();
			};
			const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
			const onMotionChange = () => {
				if (motion.matches) finish();
			};
			window.addEventListener("keydown", onEscape);
			motion.addEventListener("change", onMotionChange);
			return () => {
				clearTimeout(focus);
				window.removeEventListener("keydown", onEscape);
				motion.removeEventListener("change", onMotionChange);
			};
		},
		{
			dependencies: [active, complete, finish],
			revertOnUpdate: true,
			scope: gateRef,
		},
	);

	useGSAP(
		() => {
			if (!active) return;
			const content = document.getElementById("portfolio-content");
			const previousOverflow = document.body.style.overflow;
			const previousFocus = document.activeElement;
			const previousInert = content?.inert ?? false;
			if (content) content.inert = true;
			document.body.style.overflow = "hidden";
			return () => {
				if (content) content.inert = previousInert;
				document.body.style.overflow = previousOverflow;
				if (
					previousFocus instanceof HTMLElement &&
					previousFocus !== document.body
				) {
					previousFocus.focus({ preventScroll: true });
				} else {
					content
						?.querySelector<HTMLElement>("main")
						?.focus({ preventScroll: true });
				}
			};
		},
		{ dependencies: [active], revertOnUpdate: true, scope: gateRef },
	);

	useGSAP(
		() => {
			if (phase !== "playing") return;
			try {
				sessionStorage.setItem("hiep-intro-seen", "true");
			} catch (error) {
				console.warn("Intro preferences could not be saved.", error);
			}
		},
		{ dependencies: [phase], scope: gateRef },
	);

	useGSAP(
		() => {
			if (phase !== "leaving") return;
			const content = document.getElementById("portfolio-content");
			if (
				!content ||
				window.matchMedia("(prefers-reduced-motion: reduce)").matches
			) {
				finish();
				return;
			}

			const timeline = gsap.timeline({
				id: "portfolio-intro-reveal",
				defaults: { ease: "power3.out", duration: 0.8 },
				onComplete: finish,
			});
			timeline.to(gateRef.current, { autoAlpha: 0, duration: 0.55 }, 0).fromTo(
				content,
				{ autoAlpha: 0 },
				{
					autoAlpha: 1,
					clearProps: "opacity,visibility",
				},
				0.15,
			);

			const entrance = content.querySelectorAll(
				".site-header, .hero-copy > *, .hero .sculpture",
			);
			if (entrance.length) {
				timeline.fromTo(
					entrance,
					{ autoAlpha: 0, y: 22 },
					{
						autoAlpha: 1,
						y: 0,
						stagger: 0.07,
						clearProps: "opacity,visibility,transform",
					},
					0.2,
				);
			}
		},
		{ dependencies: [phase, finish], revertOnUpdate: true, scope: gateRef },
	);

	if (!active) return null;

	return (
		<div
			ref={gateRef}
			className="intro-gate"
			data-intro-phase={phase}
			role="dialog"
			aria-modal="true"
			aria-label="Welcome to Hiep's portfolio"
		>
			<div aria-hidden="true">
				<OldIntro key={replayKey} onComplete={complete} />
			</div>
			<span className="sr-only">Hello. Welcome to Hiep Tran's portfolio.</span>
			<button
				ref={skipRef}
				type="button"
				className="intro-skip text-link"
				onClick={complete}
			>
				Skip intro <ArrowUpRight size={17} aria-hidden="true" />
			</button>
		</div>
	);
}
