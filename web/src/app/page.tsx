"use client";

import Header from "@/components/Header";
import StatsBar from "@/components/StatsBar";
import AgentGraph from "@/components/AgentGraph";
import Terminal from "@/components/Terminal";
import TaskBoard from "@/components/TaskBoard";
import Leaderboard from "@/components/Leaderboard";
import PostTaskPanel from "@/components/PostTaskPanel";
import { useAgents, useHubFeed } from "@/lib/hub";
import { makeNameOf } from "@/lib/format";
import { useThoughts } from "@/lib/useThoughts";

export default function Home() {
  const hub = useHubFeed();
  const { agents, taskCount } = useAgents();
  const thoughts = useThoughts();
  const nameOf = makeNameOf(agents);

  const configured = Boolean(process.env.NEXT_PUBLIC_HUB_ADDRESS) && process.env.NEXT_PUBLIC_HUB_ADDRESS !== "0x";

  if (!configured) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-3 p-8">
        <h1 className="text-2xl font-bold tracking-[0.3em] text-ink">AUTONOME</h1>
        <p className="text-sm text-mute">
          Set <code className="text-monad">NEXT_PUBLIC_HUB_ADDRESS</code> in{" "}
          <code className="text-monad">web/.env.local</code> to the deployed A2AHub address, then restart the dev server.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-6">
      <Header head={hub.head} />

      <div className="mx-auto w-full max-w-[1560px] px-4">
        <StatsBar
          taskCount={taskCount}
          agents={agents}
          lifecycleBlocks={hub.lifecycleBlocks}
          feed={hub.feed}
        />

        {hub.error ? (
          <div className="mb-3 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-xs text-bad">
            RPC error: {hub.error} (check NEXT_PUBLIC_HUB_ADDRESS / RPC)
          </div>
        ) : null}

        {!hub.ready ? (
          <div className="card flex min-h-[320px] items-center justify-center text-sm text-mute">
            connecting to Monad…
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:h-[calc(100vh-19.5rem)] lg:min-h-[560px] lg:grid-cols-[300px_minmax(0,1fr)_360px]">
            <aside className="flex min-h-0 flex-col gap-4 lg:overflow-y-auto lg:pr-1">
              <AgentGraph agents={agents} feed={hub.feed} nameOf={nameOf} />
              <Leaderboard agents={agents} nameOf={nameOf} />
            </aside>

            <section className="flex min-h-[60vh] flex-col lg:min-h-0">
              <Terminal feed={hub.feed} nameOf={nameOf} thoughts={thoughts} agents={agents} />
            </section>

            <section className="flex min-h-[50vh] flex-col lg:min-h-0">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="label">Task board</h2>
                <span className="text-[10px] text-mute">latest 10</span>
              </div>
              <div className="min-h-0 flex-1 lg:overflow-y-auto lg:pr-1">
                <TaskBoard tasks={hub.tasks} nameOf={nameOf} />
              </div>
            </section>
          </div>
        )}

        <div className="mt-4">
          <PostTaskPanel />
        </div>
      </div>
    </main>
  );
}
