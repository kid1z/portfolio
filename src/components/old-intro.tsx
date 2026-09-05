"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const phrases = ["Xin chào", "Hello", "こんにちは", "안녕하세요", "Bonjour"];

export default function OldIntro({
	onComplete,
}: {
	onComplete?: () => void;
} = {}) {
	const [phraseIndex, setPhraseIndex] = useState(0);
	const [visibleLength, setVisibleLength] = useState(0);
	const [mode, setMode] = useState<"typing" | "pause" | "deleting">("typing");

	const phrase = phrases[phraseIndex];
	const visible = phrase.slice(0, visibleLength);

	useEffect(() => {
		let timeout: NodeJS.Timeout;

		// typing
		if (mode === "typing") {
			if (visibleLength < phrase.length) {
				const isSpace = phrase[visibleLength] === " ";

				timeout = setTimeout(
					() => {
						setVisibleLength((v) => v + 1);
					},
					isSpace ? 30 : 42 + Math.random() * 18,
				);
			} else {
				timeout = setTimeout(() => {
					setMode("pause");
				}, 700);
			}
		}

		// pause
		if (mode === "pause") {
			timeout = setTimeout(() => {
				setMode("deleting");
			}, 200);
		}

		// deleting
		if (mode === "deleting") {
			if (visibleLength > 0) {
				timeout = setTimeout(() => {
					setVisibleLength((v) => v - 1);
				}, 18);
			} else {
				if (onComplete && phraseIndex === phrases.length - 1) {
					onComplete();
				} else {
					setPhraseIndex((v) => (v + 1) % phrases.length);
					setMode("typing");
				}
			}
		}

		return () => clearTimeout(timeout);
	}, [visibleLength, mode, phrase, phraseIndex, onComplete]);

	return (
		<div className="flex min-h-screen items-center justify-center px-6">
			<div className="flex items-center justify-center">
				<AnimatePresence mode="popLayout">
					<motion.div
						key={visible}
						layout
						transition={{
							layout: {
								duration: mode === "deleting" ? 0.08 : 0.18,
								ease: [0.22, 1, 0.36, 1],
							},
						}}
						className="flex items-center"
					>
						<motion.span
							layout
							className="whitespace-nowrap text-[34px] font-bold leading-none tracking-[-0.035em] text-black"
						>
							{visible}
						</motion.span>

						<motion.div
							layout
							animate={{
								scale: mode === "typing" ? [1, 0.94, 1] : 1,
							}}
							transition={{
								layout: {
									duration: mode === "deleting" ? 0.06 : 0.16,
									ease: [0.22, 1, 0.36, 1],
								},
								duration: 0.45,
							}}
							className="ml-[4px] h-[30px] w-[30px] rounded-full bg-black"
						/>
					</motion.div>
				</AnimatePresence>
			</div>
		</div>
	);
}
