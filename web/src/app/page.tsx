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
    <main className="min-h-screen">
      <Header head={hub.head} />
      <StatsBar taskCount={taskCount} agents={agents} lifecycleBlocks={hub.lifecycleBlocks} feed={hub.feed} />

      {hub.error ? (
        <div className="mx-4 mb-2 rounded border border-bad/40 bg-bad/10 px-3 py-2 text-xs text-bad">
          RPC error: {hub.error} (check NEXT_PUBLIC_HUB_ADDRESS / RPC)
        </div>
      ) : null}

      {!hub.ready ? (
        <div className="mx-4 rounded-lg border border-edge bg-panel p-8 text-sm text-mute">connecting to Monad…</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[320px_1fr_380px]">
          <div className="flex flex-col gap-4">
            <AgentGraph agents={agents} feed={hub.feed} nameOf={nameOf} />
            <Leaderboard agents={agents} nameOf={nameOf} />
          </div>

          <div className="flex min-h-[60vh] flex-col">
            <Terminal feed={hub.feed} nameOf={nameOf} thoughts={thoughts} agents={agents} />
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-[10px] uppercase tracking-widest text-mute">Task board</div>
            <TaskBoard tasks={hub.tasks} nameOf={nameOf} />
          </div>
        </div>
      )}

      <div className="px-4 pb-6">
        <PostTaskPanel />
      </div>
    </main>
  );
}
