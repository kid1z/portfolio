import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { useRef } from "react";

gsap.registerPlugin(useGSAP, DrawSVGPlugin);

export default function IntroAnimation() {
	const logoRef = useRef<SVGSVGElement>(null);
	const overlayRef = useRef<HTMLDivElement>(null);

	useGSAP(
		() => {
			if (!logoRef.current) return;

			const paths = gsap.utils.toArray<SVGPathElement>("path");

			gsap.set(logoRef.current, { display: "block" });

			gsap.set(paths, {
				drawSVG: "0%",
			});

			const tl = gsap.timeline({
				defaults: { ease: "power1.inOut" },
			});

			tl.to(paths[0], {
				drawSVG: "0% 100%",
				duration: 2.5,
			});

			// tl.to(logoRef.current, { opacity: 0, duration: 0.2 }, "+=0.5")
			tl.to(
				overlayRef.current,
				{ y: "-100%", ease: "expo.inOut", duration: 2 },
				"+=0.5",
			);

			return () => {
				gsap.set(logoRef.current, { display: "none" });
				gsap.set(paths, { drawSVG: "0%" });
				tl.kill();
			};
		},
		{ scope: logoRef },
	);

	return (
		<div
			ref={overlayRef}
			className="flex h-screen items-center justify-center bg-gray-950 text-white"
		>
			<svg
				width="705"
				height="400"
				viewBox="0 0 705 400"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				ref={logoRef}
				style={{ display: "none" }}
			>
				<title>hiep logo</title>
				<path
					d="M74 216.097C118 174.431 192.2 81.2973 137 42.0973C125.5 36.9306 101.2 34.4973 96 66.0973V263.598C92.5 232.431 118 180 149.5 184.5C164 185.5 166 199 178 244.098C185.5 266.264 209.9 293.998 247.5 227.598L250.5 165.598C244.5 210.264 246.3 292.398 301.5 263.598C340.667 242.598 405.7 194.498 352.5 170.098C329.667 163.931 293.1 172.398 329.5 255.598C354 274.931 413 284.898 453 170.098L457 358.098C475.667 321.898 502 243.598 516 165.598C519.248 147.5 499.2 70.6219 430 137.5C406.333 164.898 387.4 224.175 557 216.097H674"
					stroke="white"
					stroke-width="23"
					stroke-linecap="round"
				/>
			</svg>

			{/* <svg
				ref={logoRef}
				style={{ display: "none" }}
				width="505"
				height="323"
				viewBox="0 0 505 323"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<title>hiep logo</title>
				<path
					d="M385.406 322.598L382.236 173.598L381.406 134.598C341.406 249.398 282.406 239.431 257.906 220.098C221.506 136.898 258.073 128.431 280.906 134.598C334.106 158.998 269.073 207.098 229.906 228.098C174.706 256.898 172.906 174.764 178.906 130.098L175.906 192.098C138.306 258.498 113.906 230.764 106.406 208.598C94.4062 163.5 92.4062 150 77.9062 149C46.4062 144.5 20.9062 196.931 24.4062 228.098V30.5973C29.6062 -1.00269 53.9062 1.43065 65.4062 6.59731C120.606 45.7973 46.4062 138.931 2.40625 180.597M382.236 173.598C402.126 137.431 442.406 99 445.406 180.597C444.073 202.764 448.906 208 503.906 216"
					stroke="white"
					strokeWidth="20"
				/>
			</svg> */}

			{/* <svg
				width="499"
				height="323"
				viewBox="0 0 499 323"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
        ref={logoRef}
        style={{ display: 'none' }}
			>
				<title>hiep logo</title>
				<path
					d="M385.406 322.598L382.236 173.598L381.406 134.598C341.406 249.398 282.406 239.431 257.906 220.098C221.506 136.898 258.073 128.431 280.906 134.598C334.106 158.998 269.073 207.098 229.906 228.098C174.706 256.898 172.906 174.764 178.906 130.098L175.906 192.098C138.306 258.498 113.906 230.764 106.406 208.598C116.006 151.798 89.4062 135.598 74.9062 134.598C26.1063 134.598 20.9062 196.931 24.4062 228.098V30.5973C29.6062 -1.00269 53.9062 1.43065 65.4062 6.59731C120.606 45.7973 46.4062 138.931 2.40625 180.597M382.236 173.598C402.126 137.431 445.106 88.2977 457.906 181.098C456.573 203.264 462.506 243.698 496.906 228.098"
					stroke="white"
					strokeWidth="5"
				/>
			</svg> */}
		</div>
	);
}
