import { createFileRoute } from '@tanstack/react-router'
import IntroAnimation from '#/components/intro-animation'
import ChatGPTIOSLoginOrb from '#/components/typing'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    // <IntroAnimation />
    <ChatGPTIOSLoginOrb />
    // <div className="flex h-screen items-center justify-center bg-gray-950 text-white">
    //   <div className="p-8">
    //     <h1 className="text-4xl font-bold">Welcome to TanStack Start</h1>
    //     <p className="mt-4 text-lg">
    //       Edit <code>src/routes/index.tsx</code> to get started.
    //     </p>
    //   </div>
    // </div>
  )
}
