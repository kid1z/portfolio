"use client";

import {
	ArrowDown,
	ArrowRight,
	ArrowUpRight,
	Github,
	Moon,
	RotateCcw,
	Sun,
} from "lucide-react";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { profile, projects } from "#/lib/profile";
import { usePortfolioScroll } from "#/lib/use-portfolio-scroll";
import Sculpture from "./sculpture";
import Signature from "./signature";
import IntroGreeting from "./typing";

function subscribeTheme(callback: () => void) {
	const query = window.matchMedia("(prefers-color-scheme: dark)");
	query.addEventListener("change", callback);
	return () => query.removeEventListener("change", callback);
}

function subscribeMotion(callback: () => void) {
	const query = window.matchMedia("(prefers-reduced-motion: reduce)");
	query.addEventListener("change", callback);
	return () => query.removeEventListener("change", callback);
}

const getDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
const getReducedMotion = () =>
	window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const getServerSnapshot = () => false;

const pageWidth =
	"mx-auto w-[min(calc(100%_-_112px),1328px)] max-[68.8125rem]:w-[calc(100%_-_72px)] max-md:w-[calc(100%_-_40px)]";
const sectionSpace = "py-[110px] max-[68.8125rem]:py-[85px] max-md:py-[66px]";
const primaryButton =
	"inline-flex min-h-[52px] items-center justify-center gap-6 rounded-full bg-accent-fill px-[25px] py-[15px] text-[13px] font-semibold whitespace-nowrap text-on-accent transition-[translate,scale,background] duration-[220ms] ease-[ease] hover:-translate-y-[3px] active:translate-y-0 active:scale-[0.98] [&_svg]:transition-transform [&_svg]:duration-[220ms] [&_svg]:ease-[ease] hover:[&_svg]:translate-x-0.5 hover:[&_svg]:-translate-y-0.5 max-md:min-h-12 max-md:gap-5 max-md:px-[22px] max-md:py-[13px] max-md:text-[12px]";
const textLink =
	"inline-flex items-center gap-[9px] text-[13px] font-medium whitespace-nowrap transition-colors duration-[180ms] ease-[ease] hover:text-accent [&_svg:last-child]:transition-transform [&_svg:last-child]:duration-[220ms] [&_svg:last-child]:ease-[ease] hover:[&_svg:last-child]:translate-x-0.5 hover:[&_svg:last-child]:-translate-y-0.5";
const navLink =
	"flex items-center gap-[5px] py-3 transition-colors duration-[180ms] ease-[ease] hover:text-accent";
const footerLink =
	"flex items-center gap-[5px] bg-transparent py-2.5 text-inherit hover:text-accent";

export default function Portfolio({
	aboutPage = false,
}: {
	aboutPage?: boolean;
}) {
	const systemDark = useSyncExternalStore(
		subscribeTheme,
		getDark,
		getServerSnapshot,
	);
	const reducedMotion = useSyncExternalStore(
		subscribeMotion,
		getReducedMotion,
		getServerSnapshot,
	);
	const [theme, setTheme] = useState<boolean | null>(null);
	const [replayKey, setReplayKey] = useState(0);
	const [introActive, setIntroActive] = useState(!aboutPage);
	const [scrollReady, setScrollReady] = useState(aboutPage);
	const dark = theme ?? systemDark;
	const contentRef = useRef<HTMLDivElement>(null);
	const smoothWrapperRef = useRef<HTMLDivElement>(null);
	const smoothContentRef = useRef<HTMLDivElement>(null);
	const onIntroActiveChange = useCallback((active: boolean) => {
		setIntroActive(active);
		if (!active) setScrollReady(true);
	}, []);

	usePortfolioScroll({
		root: contentRef,
		wrapper: smoothWrapperRef,
		content: smoothContentRef,
		enabled: scrollReady,
		paused: introActive,
		initialSection: aboutPage ? "about" : undefined,
	});

	useEffect(() => {
		document.documentElement.dataset.theme = dark ? "dark" : "light";
		return () => {
			delete document.documentElement.dataset.theme;
		};
	}, [dark]);

	useEffect(() => {
		if (reducedMotion) return;
		const elements =
			contentRef.current?.querySelectorAll<HTMLElement>("[data-reveal]");
		if (!elements) return;
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						entry.target.classList.add("revealed");
						observer.unobserve(entry.target);
					}
				}
			},
			{ threshold: 0.08 },
		);
		for (const element of elements) {
			element.classList.add("will-reveal");
			observer.observe(element);
		}
		return () => {
			observer.disconnect();
			for (const element of elements) element.classList.remove("will-reveal");
		};
	}, [reducedMotion]);

	return (
		<>
			{!aboutPage && (
				<IntroGreeting
					replayKey={replayKey}
					onActiveChange={onIntroActiveChange}
				/>
			)}
			<div id="portfolio-content" ref={contentRef}>
				<a
					href="#main"
					className="fixed top-4 left-6 z-(--z-skip) -translate-y-[150%] rounded-panel bg-ink px-[22px] py-3.5 text-paper focus:translate-y-0"
				>
					Skip to content
				</a>
				<div id="smooth-wrapper" ref={smoothWrapperRef}>
					<div id="smooth-content" ref={smoothContentRef} className="flow-root">
						<header
							className={`site-header ${pageWidth} flex h-20 items-center gap-[34px] max-[68.8125rem]:h-[76px] max-md:gap-[17px] max-[22.5rem]:gap-3`}
						>
							<a
								href="/#home"
								className="flex items-center gap-[15px] text-[15px] font-semibold whitespace-nowrap max-md:gap-0"
								aria-label="Hiep Tran, home"
							>
								<Signature />
								<span className="max-md:hidden">
									Hiep Tran<span className="text-accent">.</span>
								</span>
							</a>
							<nav
								className="ml-auto flex gap-[34px] text-[13px] max-md:gap-5 max-md:text-[12px] max-md:[&_svg]:hidden max-[22.5rem]:gap-3.5"
								aria-label="Main navigation"
							>
								<a href="#work" className={navLink}>
									Work
								</a>
								<a href="#about" className={navLink}>
									About
								</a>
								<a href="#contact" className={navLink}>
									Contact <ArrowUpRight size={14} aria-hidden="true" />
								</a>
							</nav>
							<button
								type="button"
								className="inline-flex size-[38px] items-center justify-center rounded-full border border-line bg-transparent transition-[background,scale] duration-[160ms] ease-[ease] enabled:hover:bg-surface enabled:active:scale-[0.94] max-md:size-8"
								aria-label={
									dark ? "Switch to light theme" : "Switch to dark theme"
								}
								onClick={() => setTheme(!dark)}
							>
								{dark ? <Sun size={18} /> : <Moon size={18} />}
							</button>
						</header>

						<main id="main" tabIndex={-1}>
							<section
								className={`hero ${pageWidth} grid min-h-[min(760px,calc(100svh_-_80px))] grid-cols-2 items-center gap-0 pt-6 pb-[54px] min-[100rem]:min-h-[760px] max-[68.8125rem]:min-h-[590px] max-[68.8125rem]:pb-[34px] max-md:min-h-auto max-md:grid-cols-1 max-md:pt-[35px] max-md:pb-[37px]`}
								id="home"
								tabIndex={-1}
								aria-labelledby="hero-heading"
							>
								<div className="hero-copy relative pb-11 max-md:pb-0">
									<p className="mb-7 text-[11px] font-semibold tracking-[0.13em] uppercase max-md:mb-[23px] max-md:text-[9px] max-md:tracking-[0.12em]">
										Software developer & curious maker
									</p>
									<h1
										id="hero-heading"
										className="text-[clamp(44px,5.65vw,83px)] leading-[1.12] font-[550] tracking-[-0.065em] whitespace-nowrap max-[68.8125rem]:text-[clamp(43px,5.5vw,65px)] max-md:text-[clamp(43px,9.8vw,70px)] max-md:tracking-[-0.06em] max-[22.5rem]:text-[39px]"
									>
										Good code.
										<br />
										<span className="text-muted">A curious mind.</span>
									</h1>
									<p className="mt-7 max-w-[350px] text-[17px] leading-[1.65] text-muted max-[68.8125rem]:max-w-[310px] max-[68.8125rem]:text-[15px] max-md:mt-[22px] max-md:max-w-[350px]">
										I'm Hiep. I build thoughtful web experiences, useful tools,
										and things that are a little unexpected.
									</p>
									<div className="mt-9 flex items-center gap-[30px] max-[68.8125rem]:gap-5 max-md:mt-[27px] max-md:gap-[25px] max-[22.5rem]:gap-5">
										<a href="#work" className={primaryButton}>
											Explore work <ArrowDown size={18} aria-hidden="true" />
										</a>
										<a
											href={profile.github}
											target="_blank"
											rel="noreferrer"
											className={textLink}
										>
											<Github size={17} aria-hidden="true" /> GitHub{" "}
											<ArrowUpRight size={15} aria-hidden="true" />
										</a>
									</div>
								</div>
								<Sculpture dark={dark} reducedMotion={reducedMotion} />
							</section>

							<section
								className={`${pageWidth} ${sectionSpace} border-t border-line`}
								id="work"
								tabIndex={-1}
								aria-labelledby="work-heading"
							>
								<div className="mb-[55px] max-md:mb-[34px]" data-reveal>
									<h2
										id="work-heading"
										className="text-[clamp(35px,4vw,56px)] leading-[1.15] font-medium tracking-[-0.055em] max-md:text-[clamp(31px,6.6vw,45px)]"
									>
										A few things
										<br />
										I've put into the world
										<span className="text-accent">.</span>
									</h2>
									<p className="mt-5 text-[15px] leading-[1.65] text-muted max-md:mt-4 max-md:text-[13px]">
										Small ideas, real projects. Always something to learn.
									</p>
								</div>
								<div className="grid grid-cols-[1.18fr_1fr] items-start gap-[52px] max-[68.8125rem]:gap-[34px] max-md:grid-cols-1 max-md:gap-[42px]">
									{projects.map((project) => (
										<article
											className={
												project.className === "project-health"
													? "md:mt-[110px]"
													: undefined
											}
											key={project.name}
											data-reveal
										>
											<a
												href={project.url}
												target="_blank"
												rel="noreferrer"
												className="group/project relative block rounded-panel"
												aria-label={`View ${project.name} source on GitHub`}
											>
												<div
													className={`flex items-center justify-center overflow-hidden rounded-panel max-md:aspect-[1.25] ${project.className === "project-health" ? "aspect-[1.14] bg-[#deddd5]" : "aspect-[1.32] bg-[#dddcd4]"}`}
												>
													<img
														src={project.image}
														alt={project.imageAlt}
														width={1440}
														height={1000}
														loading="lazy"
														className={`rounded-[5px] object-cover shadow-[0_18px_35px_#24272018] transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover/project:scale-[1.045] group-hover/project:-rotate-1 group-focus-visible/project:scale-[1.045] group-focus-visible/project:-rotate-1 ${project.className === "project-health" ? "h-[85%] w-[81%] object-center max-md:h-[87%] max-md:w-4/5 max-md:bg-white max-md:object-contain" : "h-auto w-[86%]"}`}
													/>
												</div>
												<span
													className="absolute right-[18px] bottom-[18px] grid size-[45px] translate-y-[5px] place-items-center rounded-full bg-[#f5f4ef] text-[#2d2d28] opacity-0 transition-[transform,opacity,translate] duration-250 ease-[ease] group-hover/project:translate-y-0 group-hover/project:opacity-100 group-focus-visible/project:translate-y-0 group-focus-visible/project:opacity-100"
													aria-hidden="true"
												>
													<ArrowUpRight size={23} />
												</span>
											</a>
											<div className="mt-[25px] mb-[9px] text-[11px] text-muted max-md:mt-5">
												{project.category}
											</div>
											<h3 className="text-[25px] font-[550] tracking-[-0.04em] max-md:text-[24px]">
												<a
													href={project.url}
													target="_blank"
													rel="noreferrer"
													className="flex items-center justify-between gap-3 hover:text-accent"
												>
													{project.name}{" "}
													<ArrowUpRight size={24} aria-hidden="true" />
												</a>
											</h3>
											<p className="mt-[15px] max-w-[420px] text-[14px] leading-[1.7] text-muted max-md:mt-3">
												{project.description}
											</p>
											<ul
												className="mt-[22px] flex list-none flex-wrap gap-[18px] p-0 text-[10px] text-muted max-md:mt-[17px]"
												aria-label={`${project.name} technologies`}
											>
												{project.stack.map((tech) => (
													<li key={tech}>{tech}</li>
												))}
											</ul>
										</article>
									))}
								</div>
								<a
									className="group/repo mt-[68px] grid grid-cols-[65px_1fr_auto] items-center gap-[25px] border-y border-line py-8 max-md:mt-[42px] max-md:grid-cols-[38px_1fr] max-md:gap-[18px] max-md:py-[26px]"
									href="https://github.com/kid1z/nextjs-java-monorepo-starter"
									target="_blank"
									rel="noreferrer"
									data-reveal
								>
									<div
										className="font-[monospace] text-[33px] tracking-[-0.1em] text-accent max-md:text-[25px]"
										aria-hidden="true"
									>
										{"{ }"}
									</div>
									<div>
										<h3 className="text-[19px] font-medium tracking-[-0.03em] max-md:text-[18px]">
											A better starting point.
										</h3>
										<p className="mt-[9px] max-w-[520px] text-[12px] leading-[1.65] text-muted">
											A Next.js + Spring Boot monorepo starter, with auth, a
											typed frontend, and PostgreSQL.
										</p>
									</div>
									<span className="flex items-center gap-4 text-[12px] whitespace-nowrap group-hover/repo:text-accent max-md:col-start-2 max-md:text-[11px]">
										View source <ArrowUpRight size={20} aria-hidden="true" />
									</span>
								</a>
								<a
									href={`${profile.github}?tab=repositories`}
									target="_blank"
									rel="noreferrer"
									className={`${textLink} mt-[25px]`}
								>
									More on GitHub <ArrowUpRight size={17} aria-hidden="true" />
								</a>
							</section>

							<section
								className={`${pageWidth} grid grid-cols-[0.75fr_1.25fr] gap-20 pt-[90px] pb-[110px] max-[68.8125rem]:grid-cols-[0.7fr_1.3fr] max-[68.8125rem]:gap-[42px] max-[68.8125rem]:py-[85px] max-md:grid-cols-1 max-md:gap-8 max-md:py-[66px]`}
								id="about"
								tabIndex={-1}
								aria-labelledby="about-heading"
							>
								<div
									className="flex items-center gap-5 self-start pt-3 max-[68.8125rem]:flex-col max-[68.8125rem]:items-start max-[68.8125rem]:gap-4 max-md:flex-row max-md:items-center max-md:pt-0"
									data-reveal
								>
									<img
										src="/images/avatar.jpg"
										width={112}
										height={112}
										loading="lazy"
										alt="Hiep's GitHub avatar, Teemo watching a sunset"
										className="size-[82px] rounded-full saturate-[0.55] max-md:size-[65px]"
									/>
									<div>
										<span className="block text-[14px] font-semibold">
											Hiep Tran
										</span>
										<span className="mt-[7px] block text-[11px] text-muted">
											@kid1z on GitHub
										</span>
									</div>
								</div>
								<div data-reveal>
									<h2
										id="about-heading"
										className="mb-[30px] text-[clamp(38px,4vw,57px)] leading-[1.16] font-medium tracking-[-0.055em] max-md:mb-6 max-md:text-[clamp(36px,8.3vw,56px)]"
									>
										A developer.
										<br />
										Always a beginner
										<br />
										<span className="text-muted">at something.</span>
									</h2>
									<p className="mt-[18px] max-w-[490px] text-[15px] leading-[1.8] text-muted max-md:text-[14px]">
										I'm a developer from Vietnam with a soft spot for the web. I
										like taking things apart, figuring out how they work, and
										building something of my own.
									</p>
									<p className="mt-[18px] max-w-[490px] text-[15px] leading-[1.8] text-muted max-md:text-[14px]">
										My projects move between frontend interfaces, full-stack
										foundations, and small experiments. The common thread?
										Learning by making.
									</p>
									<div className="mt-[34px] mb-[33px] max-w-[490px]">
										<h3 className="mb-[15px] font-[inherit] text-[12px] font-medium">
											Things I build with
										</h3>
										<ul className="m-0 flex list-none flex-wrap gap-2 p-0">
											{[
												"TypeScript",
												"React",
												"Next.js",
												"Vue",
												"Ruby",
												"Three.js",
											].map((tool) => (
												<li
													key={tool}
													className="rounded-full border border-line px-[15px] py-2 text-[11px] text-muted"
												>
													{tool}
												</li>
											))}
										</ul>
									</div>
									<a
										href={profile.linkedin}
										target="_blank"
										rel="noreferrer"
										className={textLink}
									>
										Find me on LinkedIn{" "}
										<ArrowUpRight size={17} aria-hidden="true" />
									</a>
								</div>
							</section>

							<section
								className={`${pageWidth} mt-[25px] flex items-center justify-between gap-[30px] border-t border-line pt-[110px] pb-[115px] max-[68.8125rem]:py-[85px] max-md:mt-2.5 max-md:block max-md:py-[66px]`}
								id="contact"
								tabIndex={-1}
								aria-labelledby="contact-heading"
							>
								<div data-reveal>
									<p className="mb-[25px] text-[11px] font-semibold tracking-[0.13em] uppercase max-md:text-[9px]">
										Have something in mind?
									</p>
									<h2
										id="contact-heading"
										className="text-[clamp(45px,6.6vw,96px)] leading-[1.09] font-medium tracking-[-0.065em] max-md:text-[clamp(41px,9.1vw,64px)]"
									>
										Let's make
										<br />
										<span className="text-muted">something good.</span>
									</h2>
									<a
										className={`${primaryButton} mt-9`}
										href={profile.linkedin}
										target="_blank"
										rel="noreferrer"
									>
										Get in touch <ArrowUpRight size={20} aria-hidden="true" />
									</a>
								</div>
								<a
									href={profile.linkedin}
									target="_blank"
									rel="noreferrer"
									className="size-[165px] text-accent transition-transform duration-[350ms] ease-[ease] hover:translate-x-[7px] hover:-translate-y-[7px] max-[68.8125rem]:size-[120px] max-md:hidden"
									aria-label="Get in touch on LinkedIn"
								>
									<ArrowUpRight
										className="size-full stroke-1"
										aria-hidden="true"
									/>
								</a>
							</section>
						</main>

						<footer
							className={`${pageWidth} flex min-h-[100px] items-center justify-between gap-6 border-t border-line text-[11px] text-muted max-md:flex-col max-md:items-start max-md:justify-center max-md:gap-3.5 max-md:py-7`}
						>
							<p className="leading-[1.8]">
								Made with curiosity.{" "}
								<span className="ml-[15px] max-[68.8125rem]:ml-0 max-[68.8125rem]:block max-md:ml-2.5 max-md:inline max-[22.5rem]:m-0 max-[22.5rem]:block">
									© {new Date().getFullYear()} Hiep Tran
								</span>
							</p>
							<div className="flex items-center gap-[25px] max-md:w-full max-md:justify-between max-md:gap-3">
								<a
									href={profile.github}
									target="_blank"
									rel="noreferrer"
									className={footerLink}
								>
									GitHub <ArrowUpRight size={13} aria-hidden="true" />
								</a>
								<a
									href={profile.codepen}
									target="_blank"
									rel="noreferrer"
									className={footerLink}
								>
									CodePen <ArrowUpRight size={13} aria-hidden="true" />
								</a>
								{!reducedMotion && !aboutPage && (
									<button
										type="button"
										className={footerLink}
										onClick={() => setReplayKey((value) => value + 1)}
									>
										Replay intro <RotateCcw size={13} aria-hidden="true" />
									</button>
								)}
								<a href="#home" aria-label="Back to top" className={footerLink}>
									<ArrowRight
										className="-rotate-90"
										size={18}
										aria-hidden="true"
									/>
								</a>
							</div>
						</footer>
					</div>
				</div>
			</div>
		</>
	);
}
