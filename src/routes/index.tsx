import { createFileRoute } from "@tanstack/react-router";
import Portfolio from "#/components/portfolio";
// import ChatGPTIOSLoginOrb from "#/components/typing";

export const Route = createFileRoute("/")({ component: Portfolio });

// function Home() {
//   return (
//     // <IntroAnimation />
//     <ChatGPTIOSLoginOrb />
//   )
// }
