export function shouldPlayIntro(replay = false) {
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
		return false;
	if (replay) return true;
	if (window.location.pathname !== "/" || window.location.hash) return false;
	try {
		return sessionStorage.getItem("hiep-intro-seen") !== "true";
	} catch (error) {
		console.warn("Intro preferences could not be read.", error);
		return true;
	}
}

// This self-contained function also runs in the document head, before first paint.
export const introBootstrap = `document.documentElement.dataset.intro = (${shouldPlayIntro.toString()})() ? "play" : "skip";`;
