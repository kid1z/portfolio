import { useGSAP } from "@gsap/react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import gsap from "gsap";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type RefObject, useRef } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger, ScrollSmoother);

export function usePortfolioScroll({
	root,
	wrapper,
	content,
	enabled,
	paused,
	initialSection,
}: {
	root: RefObject<HTMLDivElement | null>;
	wrapper: RefObject<HTMLDivElement | null>;
	content: RefObject<HTMLDivElement | null>;
	enabled: boolean;
	paused: boolean;
	initialSection?: string;
}) {
	const navigate = useNavigate();
	const router = useRouter();
	const smootherRef = useRef<ScrollSmoother | null>(null);
	const pausedRef = useRef(paused);

	useGSAP(
		() => {
			pausedRef.current = paused;
			smootherRef.current?.paused(paused);
		},
		{ dependencies: [paused], scope: root },
	);

	useGSAP(
		() => {
			if (!enabled || !root.current || !wrapper.current || !content.current)
				return;
			const navigation = root.current;
			const smoothWrapper = wrapper.current;
			const smoothContent = content.current;
			let anchorFocus = false;
			const position = () =>
				`top ${getComputedStyle(document.documentElement).scrollPaddingTop || "0px"}`;
			const hashTarget = () => {
				const id = window.location.hash.slice(1) || initialSection;
				return id ? document.getElementById(id) : null;
			};
			const scrollToHash = () => {
				const target = hashTarget();
				if (target && navigation.contains(target)) {
					if (smootherRef.current) {
						smoothWrapper.scrollTop = 0;
						smootherRef.current.scrollTo(target, false, position());
					} else target.scrollIntoView({ behavior: "instant" });
				}
			};

			const media = gsap.matchMedia();
			media.add(
				"(prefers-reduced-motion: no-preference) and (pointer: fine)",
				() => {
					const smoother = ScrollSmoother.create({
						wrapper: smoothWrapper,
						content: smoothContent,
						smooth: 1.1,
						smoothTouch: false,
						effects: false,
						onFocusIn: (_self, event) =>
							!pausedRef.current &&
							!anchorFocus &&
							event.target instanceof Node &&
							smoothContent.contains(event.target),
					});
					smootherRef.current = smoother;
					smoother.paused(pausedRef.current);
					scrollToHash();
					return () => {
						smoother.kill();
						smootherRef.current = null;
					};
				},
			);

			const onClick = (event: MouseEvent) => {
				const smoother = smootherRef.current;
				if (
					!smoother ||
					pausedRef.current ||
					event.defaultPrevented ||
					event.button !== 0 ||
					event.metaKey ||
					event.ctrlKey ||
					event.shiftKey ||
					event.altKey ||
					!(event.target instanceof Element)
				)
					return;
				const link = event.target.closest<HTMLAnchorElement>("a[href]");
				if (!link || link.target || link.hasAttribute("download")) return;
				const url = new URL(link.href);
				if (
					url.origin !== window.location.origin ||
					url.pathname !== window.location.pathname ||
					url.search !== window.location.search ||
					!url.hash
				)
					return;
				const target = document.getElementById(url.hash.slice(1));
				if (!target || !navigation.contains(target)) return;
				event.preventDefault();
				if (url.hash !== window.location.hash) {
					void navigate({
						hash: url.hash.slice(1),
						resetScroll: false,
						hashScrollIntoView: false,
					});
				}
				anchorFocus = true;
				target.focus({ preventScroll: true });
				anchorFocus = false;
				smoother.scrollTo(target, true, position());
			};

			scrollToHash();
			// Router restoration runs after layout effects on direct route visits.
			const initialHref = window.location.href;
			const unsubscribe = router.subscribe("onRendered", () => {
				if (window.location.href === initialHref) scrollToHash();
				unsubscribe();
			});
			navigation.addEventListener("click", onClick);
			window.addEventListener("hashchange", scrollToHash);
			return () => {
				navigation.removeEventListener("click", onClick);
				window.removeEventListener("hashchange", scrollToHash);
				unsubscribe();
				media.revert();
			};
		},
		{
			dependencies: [enabled, initialSection, navigate, router],
			revertOnUpdate: true,
			scope: root,
		},
	);
}
